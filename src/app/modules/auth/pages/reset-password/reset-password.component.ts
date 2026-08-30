import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideArrowRight, lucideCircle, lucideCircleCheck, lucideCircleX, lucideClock, lucideEye, lucideEyeOff, lucideKeyRound, lucideLock, lucideRotateCcw } from '@ng-icons/lucide';
import { AuthShellComponent } from '@app/modules/auth/components/auth-shell/auth-shell.component';
import { RecoveryFailure, RecoveryService } from '@app/modules/auth/services/recovery.service';

/** The three rules, checked live so the list can tick off as the user types. */
const RULES = {
    length: (v: string) => v.length >= 8,
    letter: (v: string) => /[A-Za-z]/.test(v),
    number: (v: string) => /[0-9]/.test(v),
};

@Component({
    selector: 'reset-password',
    imports: [ReactiveFormsModule, TranslatePipe, NzButtonModule, NzInputModule, NgIcon, AuthShellComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideArrowRight, lucideCircle, lucideCircleCheck, lucideCircleX, lucideClock, lucideEye, lucideEyeOff, lucideKeyRound, lucideLock, lucideRotateCcw })],
    templateUrl: './reset-password.component.html',
    styleUrl: './reset-password.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit, AfterViewInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _router = inject(Router);
    private readonly _recovery = inject(RecoveryService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _destroyRef = inject(DestroyRef);

    private readonly _codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

    readonly email = signal(this.emailFromState());
    readonly loading = this._recovery.resetting;
    /** Drives the spinner on the resend control, which is a separate request from the submit. */
    readonly resending = this._recovery.sending;
    readonly submitted = signal(false);
    readonly failure = signal<RecoveryFailure | null>(null);
    readonly locked = computed(() => this.failure() === 'locked');

    readonly passwordVisible = signal(false);
    readonly confirmVisible = signal(false);

    /** Ticks once a second, driving both the expiry countdown and the resend cooldown. */
    private readonly _now = signal(Date.now());

    readonly form = this._fb.nonNullable.group({
        code: ['', [Validators.required, Validators.minLength(6)]],
        password: ['', [Validators.required]],
        confirm: ['', [Validators.required]],
    });

    private readonly _password = signal('');
    private readonly _confirm = signal('');
    private readonly _confirmBlurred = signal(false);

    readonly rules = computed(() => {
        const value = this._password();
        return [
            { key: 'auth.reset.ruleLength', met: RULES.length(value) },
            { key: 'auth.reset.ruleLetter', met: RULES.letter(value) },
            { key: 'auth.reset.ruleNumber', met: RULES.number(value) },
        ];
    });
    readonly passwordValid = computed(() => this.rules().every((r) => r.met));

    /** Counts down from the server's expiry, not from page load: the user may walk to the phone. */
    readonly secondsLeft = computed(() => {
        const expiresAt = this._recovery.session()?.expiresAt;
        if (!expiresAt) return 0;
        return Math.max(0, Math.floor((new Date(expiresAt).getTime() - this._now()) / 1000));
    });
    readonly expired = computed(() => this.secondsLeft() === 0 || this.failure() === 'expired');
    readonly countdown = computed(() => {
        const s = this.secondsLeft();
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    });

    readonly resendIn = computed(() => {
        const last = this._recovery.session()?.lastSentAt ?? 0;
        return Math.max(0, 60 - Math.floor((this._now() - last) / 1000));
    });
    readonly canResend = computed(() => this.resendIn() === 0 && !this._recovery.sending());

    /** A mismatch is the normal state halfway through typing, so it only reports after a blur. */
    readonly confirmError = computed(() => {
        if (!this._confirm()) return this.submitted() ? 'auth.reset.errConfirmRequired' : null;
        if (!this.submitted() && !this._confirmBlurred()) return null;
        return this._confirm() === this._password() ? null : 'auth.reset.errMismatch';
    });

    readonly codeError = computed(() => {
        if (this.failure() === 'code') return 'auth.reset.errCodeWrong';
        if (this.failure() === 'expired') return 'auth.reset.errCodeExpired';
        if (this.failure() === 'locked') return 'auth.reset.errLocked';
        if (this.submitted() && this.form.controls.code.invalid) return 'auth.reset.errCodeRequired';
        return null;
    });

    constructor() {
        this.form.controls.password.valueChanges.subscribe((v) => this._password.set(v ?? ''));
        this.form.controls.confirm.valueChanges.subscribe((v) => this._confirm.set(v ?? ''));
        this.form.controls.code.valueChanges.subscribe(() => {
            // A retyped code clears the previous verdict, but never the passwords.
            if (this.failure() && this.failure() !== 'locked') this.failure.set(null);
        });

        const timer = setInterval(() => this._now.set(Date.now()), 1000);
        this._destroyRef.onDestroy(() => clearInterval(timer));
    }

    ngOnInit(): void {
        // Opened cold with nothing to work from: go back and ask for the address again.
        if (!this.email()) void this._router.navigate(['/auth/forgot-password']);
    }

    ngAfterViewInit(): void {
        this._codeInput()?.nativeElement.focus();
    }

    /** Paste of "123 456" or "code: 123456" should still work. */
    onCodeInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const digits = input.value.replace(/\D/g, '').slice(0, 6);
        if (digits !== input.value) {
            input.value = digits;
            this.form.controls.code.setValue(digits);
        }
    }

    onConfirmBlur(): void {
        this._confirmBlurred.set(true);
    }

    togglePassword(): void {
        this.passwordVisible.update((v) => !v);
    }

    toggleConfirm(): void {
        this.confirmVisible.update((v) => !v);
    }

    goBack(): void {
        void this._router.navigate(['/auth/forgot-password'], { state: { email: this.email() } });
    }

    startAgain(): void {
        this._recovery.clear();
        void this._router.navigate(['/auth/forgot-password'], { state: { email: this.email() } });
    }

    resend(): void {
        if (!this.canResend()) return;
        this._recovery.requestCode(this.email()).subscribe({
            next: () => {
                this.failure.set(null);
                this.form.controls.code.setValue('');
                this._message.success(this._translate.instant('auth.reset.codeResent'), { nzDuration: 6000 });
            },
            error: (error: HttpErrorResponse) => {
                const key = error.status === 429 ? 'auth.reset.errThrottled' : error.status === 0 ? 'auth.errNetwork' : 'auth.errServer';
                this._message.error(this._translate.instant(key), { nzDuration: 6000 });
            },
        });
    }

    handleSubmit(): void {
        this.submitted.set(true);
        if (this.locked()) return;

        if (this.form.controls.code.invalid || !this.passwordValid() || this._confirm() !== this._password()) {
            this.form.markAllAsTouched();
            return;
        }

        this._recovery
            .resetPassword({
                email: this.email(),
                otp: this.form.controls.code.value,
                password: this.form.controls.password.value,
            })
            .subscribe({
                next: () => {
                    const email = this.email();
                    this._recovery.clear();
                    void this._router.navigate(['/auth/reset-password/done'], { state: { email } });
                },
                error: (error: HttpErrorResponse) => {
                    const failure = this._recovery.classify(error);
                    this.failure.set(failure);
                    const keys: Record<RecoveryFailure, string> = {
                        code: 'auth.reset.errCodeWrong',
                        expired: 'auth.reset.errCodeExpired',
                        locked: 'auth.reset.errLocked',
                        throttled: 'auth.reset.errThrottled',
                        network: 'auth.errNetwork',
                        server: 'auth.errServer',
                    };
                    this._message.error(this._translate.instant(keys[failure]), { nzDuration: 6000 });
                    // The passwords are deliberately left alone. That is the whole reason the code
                    // and the password share a screen.
                },
            });
    }

    private emailFromState(): string {
        const state = this._router.getCurrentNavigation()?.extras?.state ?? history.state;
        const fromState = state?.['email'];
        if (typeof fromState === 'string' && fromState) return fromState;
        // A reload loses router state, so fall back to the session the request screen stored.
        return this._recovery.session()?.email ?? '';
    }
}
