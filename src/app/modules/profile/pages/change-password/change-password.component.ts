import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideArrowRight, lucideCheck, lucideCircle, lucideCircleCheck, lucideCircleX, lucideEye, lucideEyeOff, lucideKeyRound, lucideMail, lucideShieldCheck, lucideTriangleAlert, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SessionService } from '@app/core/services/session/session.service';
import { ProfileService } from '@app/layout/services/profile/profile.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { StrengthLevel, passwordRules, passwordStrength } from '@app/shared/utils/password-rules/password-rules';

type Step = 'details' | 'code' | 'done';

const STRENGTH_KEY: Record<StrengthLevel, string> = { weak: 'shell.password.strengthWeak', fair: 'shell.password.strengthFair', good: 'shell.password.strengthGood', strong: 'shell.password.strengthStrong' };
const STRENGTH_COLOUR: Record<StrengthLevel, string> = { weak: 'var(--color-danger)', fair: 'var(--color-warning)', good: 'var(--color-primary)', strong: 'var(--color-success)' };
const LEVELS: StrengthLevel[] = ['weak', 'fair', 'good', 'strong'];
const STEPS: Step[] = ['details', 'code', 'done'];
/** Each code sent costs one of the five tries the server allows in fifteen minutes, so a new one waits a minute. */
const RESEND_SECONDS = 60;

/**
 * Changing one's own password in three steps: the current password and the new one, the code
 * emailed to the account, then done. Every other device is signed out when it changes and this one
 * stays, which the first step says before anything is sent (decided 2026-09-11).
 */
@Component({
    selector: 'change-password',
    imports: [FormsModule, NgIcon, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzStepsModule, TranslatePipe, DigitsPipe, PageHeaderComponent, ActionFooterComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideArrowRight, lucideCheck, lucideCircle, lucideCircleCheck, lucideCircleX, lucideEye, lucideEyeOff, lucideKeyRound, lucideMail, lucideShieldCheck, lucideTriangleAlert, lucideX })],
    templateUrl: './change-password.component.html',
    styleUrl: './change-password.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
    private readonly _profiles = inject(ProfileService);
    private readonly _location = inject(Location);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    readonly session = inject(SessionService);

    readonly segments = LEVELS;
    readonly step = signal<Step>('details');
    readonly stepIndex = computed(() => STEPS.indexOf(this.step()));
    readonly saving = this._profiles.saving;

    readonly current = signal('');
    readonly next = signal('');
    readonly confirm = signal('');
    readonly code = signal('');
    readonly showCurrent = signal(false);
    readonly showNew = signal(false);
    readonly showConfirm = signal(false);
    readonly confirmBlurred = signal(false);
    readonly submitted = signal(false);

    readonly rules = computed(() => passwordRules(this.next()));
    readonly strength = computed(() => passwordStrength(this.next()));
    readonly strengthColour = computed(() => STRENGTH_COLOUR[this.strength().level]);
    readonly strengthKey = computed(() => STRENGTH_KEY[this.strength().level]);
    readonly strengthFilled = computed(() => (this.next() ? LEVELS.indexOf(this.strength().level) + 1 : 0));
    /** Shown as soon as it is true: there is nothing half-typed about repeating the password in use. */
    readonly sameAsCurrent = computed(() => !!this.next() && this.next() === this.current());
    /** The server's answer when the two steps were not enough to catch it, or a step was skipped. */
    readonly newError = signal<string | null>(null);
    readonly nextValid = computed(() => this.rules().every((rule) => rule.met) && !this.sameAsCurrent());
    /** A mismatch is normal halfway through typing, so it is reported on leaving the field or on submit. */
    readonly mismatch = computed(() => (this.confirmBlurred() || this.submitted()) && this.confirm() !== this.next());

    /** The error under a field, by its copy key, or the one for the whole step. */
    readonly currentError = signal<string | null>(null);
    readonly codeError = signal<string | null>(null);
    readonly stepError = signal<string | null>(null);

    private _otpOid: string | null = null;
    readonly sessionsClosed = signal(0);

    private readonly _now = signal(Date.now());
    private readonly _sentAt = signal(0);
    readonly resendIn = computed(() => Math.max(0, RESEND_SECONDS - Math.floor((this._now() - this._sentAt()) / 1000)));

    constructor() {
        const timer = setInterval(() => this._now.set(Date.now()), 1000);
        inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }

    sendCode(): void {
        this.submitted.set(true);
        this.currentError.set(this.current() ? null : 'shell.password.currentRequired');
        if (!this.current() || !this.nextValid() || this.confirm() !== this.next() || this.saving()) return;
        confirmAction(this._modal, {
            title: this._translate.instant('shell.password.confirmSendTitle'),
            body: this._translate.instant('shell.password.confirmSendBody', { email: this.session.user()?.email }),
            ok: this._translate.instant('shell.password.sendCode'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => confirmed && this.requestCode());
    }

    /** A fresh code replaces the one sent: the passwords already typed are still here. */
    sendAgain(): void {
        if (this.resendIn() > 0 || this.saving()) return;
        this.requestCode();
    }

    changePassword(): void {
        const code = this.code().trim();
        if (!/^\d{6}$/.test(code)) return this.codeError.set('shell.password.codeShape');
        const otpOid = this._otpOid;
        if (!otpOid || this.saving()) return;
        confirmAction(this._modal, {
            title: this._translate.instant('shell.password.confirmChangeTitle'),
            body: this._translate.instant('shell.password.othersSignedOut'),
            ok: this._translate.instant('shell.password.change'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => confirmed && this.submitCode(otpOid, code));
    }

    private requestCode(): void {
        const resending = this.step() === 'code';
        this.stepError.set(null);
        this._profiles.requestPasswordCode(this.current(), this.next()).subscribe({
            next: ({ otp_oid }) => {
                this._otpOid = otp_oid;
                this._now.set(Date.now());
                this._sentAt.set(Date.now());
                this.code.set('');
                this.codeError.set(null);
                this.step.set('code');
                if (resending) this._message.success(this._translate.instant('shell.password.codeResent'));
            },
            error: (error: unknown) => {
                const status = error instanceof HttpErrorResponse ? error.status : 0;
                const field = status === 400 && error instanceof HttpErrorResponse ? error.error?.data?.field : null;
                // On a resend the password fields are out of sight, so a refusal about one goes back to them.
                if (field === 'current_password') {
                    this.step.set('details');
                    return this.currentError.set('shell.password.currentWrong');
                }
                if (field === 'new_password') {
                    this.step.set('details');
                    return this.newError.set('shell.password.sameAsCurrent');
                }
                if (status === 429) return this.stepError.set('shell.password.sendTooMany');
                this.stepError.set(`shell.password.failed.${failureOf(error)}`);
            },
        });
    }

    private submitCode(otpOid: string, code: string): void {
        this.codeError.set(null);
        this.stepError.set(null);
        this._profiles.confirmPasswordChange(otpOid, code, this.next()).subscribe({
            next: ({ sessions_closed }) => {
                this.sessionsClosed.set(sessions_closed);
                this.step.set('done');
            },
            error: (error: unknown) => {
                const status = error instanceof HttpErrorResponse ? error.status : 0;
                if (status === 400 && error instanceof HttpErrorResponse && error.error?.data?.field === 'new_password') {
                    this.newError.set('shell.password.sameAsCurrent');
                    return this.step.set('details');
                }
                if (status === 400) return this.codeError.set('shell.password.codeWrong');
                if (status === 404) return this.stepError.set('shell.password.codeExpired');
                if (status === 429) return this.stepError.set('shell.password.codeTooMany');
                this.stepError.set(`shell.password.failed.${failureOf(error)}`);
            },
        });
    }

    /** Digits only, as on password reset: a pasted code with spaces or a dash still fits. */
    setCode(value: string): void {
        this.code.set(value.replace(/\D/g, '').slice(0, 6));
        this.codeError.set(null);
    }

    back(): void {
        this._location.back();
    }
}
