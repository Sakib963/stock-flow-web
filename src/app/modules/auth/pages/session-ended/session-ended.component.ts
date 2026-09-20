import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideClock, lucideKeyRound, lucideLogOut, lucideMonitorSmartphone, lucideShieldAlert, lucideUserX } from '@ng-icons/lucide';
import { SessionEndReason } from '@app/core/models/auth.model';
import { AuthShellComponent } from '@app/modules/auth/components/auth-shell/auth-shell.component';

interface EndedView {
    copy: string;
    icon: string;
    tone: string;
    offerReset: boolean;
}

// Whole class strings, so Tailwind finds them when it scans this file.
const CALM = 'border-line bg-primary-wash text-primary';
const WARNING = 'border-warning-border bg-warning-bg text-warning';
const DANGER = 'border-danger-border bg-danger-bg text-danger';

// A reset is offered wherever someone else may hold the account: a sign-out the person may not have
// done, a password they may not have changed, a copied sign-in.
const VIEWS: Record<SessionEndReason, EndedView> = {
    expired: { copy: 'expired', icon: 'lucideClock', tone: CALM, offerReset: false },
    'signed-out': { copy: 'signedOut', icon: 'lucideLogOut', tone: CALM, offerReset: false },
    'signed-out-elsewhere': { copy: 'signedOutElsewhere', icon: 'lucideMonitorSmartphone', tone: WARNING, offerReset: true },
    'password-changed': { copy: 'passwordChanged', icon: 'lucideKeyRound', tone: WARNING, offerReset: true },
    'account-disabled': { copy: 'accountDisabled', icon: 'lucideUserX', tone: DANGER, offerReset: false },
    security: { copy: 'security', icon: 'lucideShieldAlert', tone: DANGER, offerReset: true },
};

/**
 * Where a session that ended without the person asking lands: why it ended and what to do next.
 *
 * A page rather than a note on the sign-in form, because the reasons ask different things of the
 * person. An expiry only needs signing in again; a sign-out from another device or a copied sign-in
 * needs them to know it happened, and a turned-off account needs them to talk to their admin.
 */
@Component({
    selector: 'session-ended',
    imports: [RouterLink, TranslatePipe, NzButtonModule, NgIcon, AuthShellComponent],
    providers: [provideIcons({ lucideArrowRight, lucideClock, lucideKeyRound, lucideLogOut, lucideMonitorSmartphone, lucideShieldAlert, lucideUserX })],
    templateUrl: './session-ended.component.html',
    styleUrl: './session-ended.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionEndedComponent {
    /** From the query string, so a reload keeps it. Anything unrecognised reads as an ordinary expiry. */
    readonly reason = input<string>();
    readonly origUrl = input<string>();

    readonly view = computed(() => {
        const reason = this.reason();
        return reason && Object.hasOwn(VIEWS, reason) ? VIEWS[reason as SessionEndReason] : VIEWS.expired;
    });

    readonly signInQuery = computed(() => (this.origUrl() ? { origUrl: this.origUrl() } : {}));
}
