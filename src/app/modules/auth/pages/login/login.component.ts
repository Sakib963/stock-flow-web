import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideEye, lucideEyeOff, lucideLock, lucideMail } from '@ng-icons/lucide';
import { AuthService, LoginFailure } from '@app/core/services/auth.service';
import { AuthShellComponent } from '@app/modules/auth/components/auth-shell/auth-shell.component';
import { Constants } from '@app/core/constants/constants';

@Component({
    selector: 'login',
    imports: [ReactiveFormsModule, RouterLink, TranslatePipe, NzButtonModule, NzCheckboxModule, NzInputModule, NgIcon, AuthShellComponent],
    providers: [provideIcons({ lucideArrowRight, lucideEye, lucideEyeOff, lucideLock, lucideMail })],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements AfterViewInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _auth = inject(AuthService);
    private readonly _router = inject(Router);
    private readonly _route = inject(ActivatedRoute);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    private readonly _emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
    private readonly _passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

    readonly form = this._fb.nonNullable.group({
        email: ['', [Validators.required, Validators.pattern(Constants.EMAIL_REGEX)]],
        password: ['', [Validators.required]],
        remember: [true],
    });

    readonly loading = this._auth.loading;
    readonly passwordVisible = signal(false);
    readonly submitted = signal(false);
    readonly failure = signal<LoginFailure | null>(null);
    readonly sessionExpired = signal(this._route.snapshot.queryParamMap.get('reason') === 'expired');

    // Reactive forms are not signals, so field state is mirrored into signals for the computeds.
    private readonly _emailValue = signal('');
    private readonly _passwordValue = signal('');
    private readonly _emailBlurred = signal(false);
    private readonly _passwordBlurred = signal(false);

    readonly failureKey = computed(() => {
        const failure = this.failure();
        if (!failure) return null;
        const keys: Record<LoginFailure, string> = {
            credentials: 'auth.errBadCredentials',
            network: 'auth.errNetwork',
            server: 'auth.errServer',
            disabled: 'auth.errDisabled',
        };
        return keys[failure];
    });

    /** A rejected credential marks both fields, without saying which one was wrong. */
    readonly credentialsRejected = computed(() => this.failure() === 'credentials');

    /**
     * Malformed input is reported as it is typed, so the mistake is caught where it is made.
     * An empty field is a different case: it is the state every form opens in, so it stays quiet
     * until the field has been left or the form submitted. Nothing is red before it is touched.
     */
    readonly emailError = computed(() => {
        const value = this._emailValue().trim();
        if (!value) return this.submitted() || this._emailBlurred() ? 'auth.errEmailRequired' : null;
        return this.form.controls.email.hasError('pattern') ? 'auth.errEmailInvalid' : null;
    });

    readonly passwordError = computed(() => {
        if (this._passwordValue()) return null;
        return this.submitted() || this._passwordBlurred() ? 'auth.errPasswordRequired' : null;
    });

    constructor() {
        this.form.controls.email.valueChanges.subscribe((value) => this._emailValue.set(value ?? ''));
        this.form.controls.password.valueChanges.subscribe((value) => this._passwordValue.set(value ?? ''));

        this.form.valueChanges.subscribe(() => {
            // Once a failed attempt is being corrected, drop the alert rather than leaving a
            // stale message above fields the user has already changed.
            if (this.failure()) this.failure.set(null);
            if (this.sessionExpired()) this.sessionExpired.set(false);
        });
    }

    ngAfterViewInit(): void {
        this._emailInput()?.nativeElement.focus();

        if (this.sessionExpired()) {
            this._translate.get('auth.sessionExpired').subscribe((text: string) => this._message.info(text, { nzDuration: 8000 }));
        }
    }

    onEmailBlur(): void {
        this._emailBlurred.set(true);
    }

    onPasswordBlur(): void {
        this._passwordBlurred.set(true);
    }

    togglePasswordVisible(): void {
        this.passwordVisible.update((visible) => !visible);
    }

    handleSubmit(): void {
        this.submitted.set(true);

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const { email, password } = this.form.getRawValue();
        this.failure.set(null);

        this._auth.login({ email, password }).subscribe({
            next: () => {
                const origUrl = this._route.snapshot.queryParamMap.get('origUrl');
                void this._router.navigateByUrl(origUrl || Constants.APP_ROUTE);
            },
            error: (error: HttpErrorResponse) => {
                const failure = this._auth.classifyFailure(error);
                this.failure.set(failure);
                this._message.error(this._translate.instant(this.failureKey() ?? 'auth.errServer'), { nzDuration: 6000 });
                // Keep the email, clear the password, put the cursor where the retype starts.
                // emitEvent:false matters: valueChanges clears the alert, and resetting here
                // would wipe the message before it was painted. The mirror signal is set by
                // hand instead, so it cannot drift from the now-empty field and leave the form
                // unsubmittable with no message explaining why.
                this.form.controls.password.reset('', { emitEvent: false });
                this._passwordValue.set('');
                this._passwordBlurred.set(false);
                this._passwordInput()?.nativeElement.focus();
            },
        });
    }
}
