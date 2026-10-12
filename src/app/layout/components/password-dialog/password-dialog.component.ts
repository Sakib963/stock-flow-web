import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideCheck, lucideCircle, lucideCircleCheck, lucideCircleX, lucideEye, lucideEyeOff, lucideMail, lucideTriangleAlert, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { TranslatePipe } from '@ngx-translate/core';
import { SessionService } from '@app/core/services/session/session.service';
import { ProfileService } from '@app/layout/services/profile/profile.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { passwordRules } from '@app/shared/utils/password-rules/password-rules';

type Step = 'details' | 'code' | 'done';
const STEPS: Step[] = ['details', 'code', 'done'];

/**
 * Changing one's own password in three steps: the current password and the new one, the code
 * emailed to the account, then done. Every other device is signed out when it changes and this one
 * stays, which the first step says before anything is sent (decided 2026-09-11).
 */
@Component({
    selector: 'password-dialog',
    imports: [FormsModule, NgIcon, NzButtonModule, NzFormModule, NzInputModule, NzModalModule, NzStepsModule, TranslatePipe, DigitsPipe],
    providers: [provideIcons({ lucideArrowRight, lucideCheck, lucideCircle, lucideCircleCheck, lucideCircleX, lucideEye, lucideEyeOff, lucideMail, lucideTriangleAlert, lucideX })],
    templateUrl: './password-dialog.component.html',
    styleUrl: './password-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordDialogComponent {
    private readonly _profiles = inject(ProfileService);
    readonly session = inject(SessionService);

    readonly close = output<void>();

    readonly step = signal<Step>('details');
    readonly stepIndex = computed(() => STEPS.indexOf(this.step()));
    readonly saving = this._profiles.saving;

    readonly current = signal('');
    readonly next = signal('');
    readonly confirm = signal('');
    readonly code = signal('');
    readonly show = signal(false);
    readonly confirmBlurred = signal(false);
    readonly submitted = signal(false);

    readonly rules = computed(() => passwordRules(this.next()));
    readonly nextValid = computed(() => this.rules().every((rule) => rule.met));
    /** A mismatch is normal halfway through typing, so it is reported on leaving the field or on submit. */
    readonly mismatch = computed(() => (this.confirmBlurred() || this.submitted()) && this.confirm() !== this.next());

    /** The error under a field, by its copy key, or the one for the whole step. */
    readonly currentError = signal<string | null>(null);
    readonly codeError = signal<string | null>(null);
    readonly stepError = signal<string | null>(null);

    private _otpOid: string | null = null;
    readonly sessionsClosed = signal(0);

    sendCode(): void {
        this.submitted.set(true);
        this.currentError.set(this.current() ? null : 'shell.password.currentRequired');
        if (!this.current() || !this.nextValid() || this.confirm() !== this.next() || this.saving()) return;
        this.stepError.set(null);
        this._profiles.requestPasswordCode(this.current(), this.next()).subscribe({
            next: ({ otp_oid }) => {
                this._otpOid = otp_oid;
                this.code.set('');
                this.codeError.set(null);
                this.step.set('code');
            },
            error: (error: unknown) => {
                if (error instanceof HttpErrorResponse && error.status === 400 && error.error?.data?.field === 'current_password') return this.currentError.set('shell.password.currentWrong');
                this.stepError.set(`shell.password.failed.${failureOf(error)}`);
            },
        });
    }

    changePassword(): void {
        const code = this.code().trim();
        if (!/^\d{6}$/.test(code)) return this.codeError.set('shell.password.codeShape');
        if (!this._otpOid || this.saving()) return;
        this.codeError.set(null);
        this.stepError.set(null);
        this._profiles.confirmPasswordChange(this._otpOid, code, this.next()).subscribe({
            next: ({ sessions_closed }) => {
                this.sessionsClosed.set(sessions_closed);
                this.step.set('done');
            },
            error: (error: unknown) => {
                const status = error instanceof HttpErrorResponse ? error.status : 0;
                if (status === 400) return this.codeError.set('shell.password.codeWrong');
                if (status === 404) return this.stepError.set('shell.password.codeExpired');
                if (status === 429) return this.stepError.set('shell.password.codeTooMany');
                this.stepError.set(`shell.password.failed.${failureOf(error)}`);
            },
        });
    }

    /** A fresh code replaces the one sent: the passwords already typed are still here. */
    sendAgain(): void {
        this.sendCode();
    }
}
