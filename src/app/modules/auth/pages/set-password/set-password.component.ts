import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideCircle, lucideCircleCheck, lucideCircleX, lucideEye, lucideEyeOff, lucideKeyRound, lucideLock, lucideLogOut, lucideShieldCheck } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Constants } from '@app/core/constants/constants';
import { AuthService } from '@app/core/services/auth/auth.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ProfileService } from '@app/layout/services/profile/profile.service';
import { AuthShellComponent } from '@app/modules/auth/components/auth-shell/auth-shell.component';
import { passwordRules } from '@app/shared/utils/password-rules/password-rules';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

type Field = 'current' | 'password' | 'confirm';

/**
 * The first sign-in of an account someone else created. The temporary password proves it is them,
 * then they choose their own, so whoever made the account never knows it. Nothing else opens first.
 */
@Component({
    selector: 'set-password',
    imports: [ReactiveFormsModule, TranslatePipe, NzButtonModule, NzInputModule, NgIcon, AuthShellComponent],
    providers: [provideIcons({ lucideArrowRight, lucideCircle, lucideCircleCheck, lucideCircleX, lucideEye, lucideEyeOff, lucideKeyRound, lucideLock, lucideLogOut, lucideShieldCheck })],
    templateUrl: './set-password.component.html',
    styleUrl: './set-password.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetPasswordComponent {
    private readonly _router = inject(Router);
    private readonly _auth = inject(AuthService);
    private readonly _profiles = inject(ProfileService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    readonly session = inject(SessionService);
    readonly saving = this._profiles.saving;
    readonly signingOut = signal(false);
    readonly submitted = signal(false);
    readonly visible = signal<Record<Field, boolean>>({ current: false, password: false, confirm: false });
    /** A message from the server about one field, such as a wrong temporary password. */
    readonly serverError = signal<{ field: Field; key: string } | null>(null);
    private readonly _confirmBlurred = signal(false);

    readonly form = inject(FormBuilder).nonNullable.group({
        current: ['', [Validators.required]],
        password: ['', [Validators.required]],
        confirm: ['', [Validators.required]],
    });

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
    readonly rules = computed(() => passwordRules(this._value().password ?? ''));
    readonly passwordValid = computed(() => this.rules().every((rule) => rule.met));
    readonly sameAsCurrent = computed(() => !!this._value().password && this._value().password === this._value().current);

    readonly currentError = computed(() => {
        const server = this.serverError();
        if (server?.field === 'current') return server.key;
        return this.submitted() && !this._value().current ? 'auth.setPassword.currentRequired' : null;
    });
    readonly passwordError = computed(() => {
        const server = this.serverError();
        if (server?.field === 'password') return server.key;
        return this.sameAsCurrent() ? 'auth.setPassword.sameAsTemporary' : null;
    });
    /** A mismatch is the normal state halfway through typing, so it only reports after a blur or a submit. */
    readonly confirmError = computed(() => {
        if (!this._confirmBlurred() && !this.submitted()) return null;
        const { password, confirm } = this._value();
        if (!confirm) return this.submitted() ? 'auth.setPassword.confirmRequired' : null;
        return confirm !== password ? 'auth.setPassword.mismatch' : null;
    });

    toggle(field: Field): void {
        this.visible.update((v) => ({ ...v, [field]: !v[field] }));
    }

    onConfirmBlur(): void {
        this._confirmBlurred.set(true);
    }

    submit(): void {
        if (this.saving()) return;
        this.submitted.set(true);
        this.serverError.set(null);
        if (!this._value().current || !this.passwordValid() || this.sameAsCurrent() || this.confirmError()) return;

        const { current, password } = this.form.getRawValue();
        this._profiles.setFirstPassword(current, password).subscribe({
            next: () => {
                this.session.updateUser({ mustChangePassword: false });
                this._message.success(this._translate.instant('auth.setPassword.done'));
                void this._router.navigateByUrl(Constants.APP_ROUTE);
            },
            error: (error: unknown) => {
                const field = error instanceof HttpErrorResponse ? error.error?.data?.field : null;
                if (field === 'current_password') return this.serverError.set({ field: 'current', key: 'auth.setPassword.wrongTemporary' });
                if (field === 'new_password') return this.serverError.set({ field: 'password', key: 'auth.setPassword.sameAsTemporary' });
                if (error instanceof HttpErrorResponse && error.status === 429) return void this._message.error(this._translate.instant('auth.setPassword.tooMany'));
                this._message.error(this._translate.instant(`auth.setPassword.failed.${failureOf(error)}`));
            },
        });
    }

    async signOut(): Promise<void> {
        if (this.signingOut()) return;
        this.signingOut.set(true);
        try {
            await this._auth.signOut();
            this.session.clear();
        } catch {
            this._message.error(this._translate.instant('auth.setPassword.signOutFailed'));
        } finally {
            this.signingOut.set(false);
        }
    }
}
