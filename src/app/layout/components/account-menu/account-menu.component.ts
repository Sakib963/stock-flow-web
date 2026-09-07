import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarClock, lucideCircleUser, lucideGlobe, lucideKeyboard, lucideLogOut } from '@ng-icons/lucide';
import { AuthService } from '@app/core/services/auth.service';
import { LanguageService } from '@app/core/services/language.service';
import { SessionService } from '@app/core/services/session.service';
import { BadgeComponent } from '@app/layout/components/badge/badge.component';
import { ShellStateService } from '@app/layout/services/shell-state.service';

/**
 * The account menu: who is signed in, the language switch, and the way out.
 *
 * A dropdown at every width. A short menu anchored to its own avatar reads correctly on a phone
 * too, so unlike search and notifications this one never becomes a sheet.
 */
@Component({
    selector: 'account-menu',
    imports: [NzTooltipModule, TranslatePipe, NgIcon, BadgeComponent],
    providers: [provideIcons({ lucideCalendarClock, lucideCircleUser, lucideGlobe, lucideKeyboard, lucideLogOut })],
    // The host draws no box of its own, so the panel stays the direct child of the dropdown
    // overlay that the CDK positions.
    host: { class: 'contents' },
    templateUrl: './account-menu.component.html',
    styleUrl: './account-menu.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenuComponent {
    private readonly _auth = inject(AuthService);

    readonly state = inject(ShellStateService);
    readonly session = inject(SessionService);
    readonly language = inject(LanguageService);

    signOut(): void {
        this.session.clear();
        this._auth.signOut();
    }
}
