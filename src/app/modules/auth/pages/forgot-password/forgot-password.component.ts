import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideArrowRight, lucideMail } from '@ng-icons/lucide';
import { AuthShellComponent } from '@app/modules/auth/components/auth-shell/auth-shell.component';
import { RecoveryService } from '@app/modules/auth/services/recovery.service';
import { Constants } from '@app/core/constants/constants';

@Component({
    selector: 'forgot-password',
    imports: [ReactiveFormsModule, RouterLink, TranslatePipe, NzButtonModule, NzInputModule, NgIcon, AuthShellComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideArrowRight, lucideMail })],
    templateUrl: './forgot-password.component.html',
    styleUrl: './forgot-password.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent implements AfterViewInit {
    private readonly _fb = inject(FormBuilder);
    private readonly _router = inject(Router);
    private readonly _recovery = inject(RecoveryService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    private readonly _emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');

    readonly loading = this._recovery.sending;
    readonly submitted = signal(false);

    private readonly _emailValue = signal('');
    private readonly _emailBlurred = signal(false);
    /** Set when the server says the address has no account. Cleared as soon as it is edited. */
    private readonly _unknownAddress = signal(false);

    readonly form = this._fb.nonNullable.group({
        // Prefilled from router state when the user typed an address on sign-in before clicking
        // through. Never from localStorage: the counter machine is shared.
        email: [this.prefill(), [Validators.required, Validators.pattern(Constants.EMAIL_REGEX)]],
    });

    readonly emailError = computed(() => {
        const value = this._emailValue().trim();
        if (!value) return this.submitted() || this._emailBlurred() ? 'auth.errEmailRequired' : null;
        if (this.form.controls.email.hasError('pattern')) return 'auth.errEmailInvalid';
        return this._unknownAddress() ? 'auth.reset.errNoAccount' : null;
    });

    constructor() {
        this._emailValue.set(this.form.controls.email.value);
        this.form.controls.email.valueChanges.subscribe((value) => {
            this._emailValue.set(value ?? '');
            // Editing the address is the user answering the message, so it goes straight away.
            if (this._unknownAddress()) this._unknownAddress.set(false);
        });
    }

    ngAfterViewInit(): void {
        this._emailInput()?.nativeElement.focus();
    }

    onEmailBlur(): void {
        this._emailBlurred.set(true);
    }

    handleSubmit(): void {
        this.submitted.set(true);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const email = this.form.controls.email.value.trim();
        this._unknownAddress.set(false);

        this._recovery.requestCode(email).subscribe({
            next: () => this.advance(email),
            error: (error: HttpErrorResponse) => {
                // An address with no account stops here and says so. Sending the user on to wait
                // for an email that will never arrive is the one outcome worth avoiding: a typo is
                // far more likely than an attacker, and the typo has no other way of being found.
                if (error.status === 404) {
                    // Both channels on purpose. The toast is what catches the eye of someone who
                    // has just pressed the button and is looking at it; the inline message is what
                    // is still there a moment later, next to the address that needs correcting.
                    this._unknownAddress.set(true);
                    this._message.error(this._translate.instant('auth.reset.errNoAccount'), { nzDuration: 6000 });
                    return;
                }
                const key = error.status === 0 ? 'auth.errNetwork' : error.status === 429 ? 'auth.reset.errThrottled' : 'auth.errServer';
                this._message.error(this._translate.instant(key), { nzDuration: 6000 });
            },
        });
    }

    private advance(email: string): void {
        this._message.success(this._translate.instant('auth.reset.codeSent'), { nzDuration: 6000 });
        void this._router.navigate(['/auth/reset-password'], { state: { email } });
    }

    private prefill(): string {
        const state = this._router.getCurrentNavigation()?.extras?.state ?? history.state;
        const email = state?.['email'];
        return typeof email === 'string' ? email : '';
    }
}
