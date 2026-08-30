import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// PLACEHOLDER, and a known gap. The sign-in design requires a working "Forgot password?" link
// rather than one pointing at nothing, but the recovery and OTP screens have not been designed
// yet (they are the next design task). This route exists so the link is honest about where it
// leads; it is not a designed screen and should be replaced, not extended.
@Component({
    selector: 'forgot-password',
    imports: [RouterLink],
    template: `
        <div class="flex min-h-dvh items-center justify-center bg-white p-8">
            <div class="w-[368px]">
                <h1 class="text-n-900 text-2xl font-bold tracking-[-0.02em]">Password recovery</h1>
                <p class="text-n-500 mt-2 text-sm leading-relaxed">This screen has not been built yet. To get back in, ask your shop admin to reset the password on your account.</p>
                <a class="mt-6 inline-block text-sm font-semibold text-primary-6" routerLink="/auth/login">Back to sign in</a>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {}
