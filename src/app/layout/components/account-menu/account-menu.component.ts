import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleUser, lucideGlobe, lucideKeyRound, lucideKeyboard, lucideLogOut } from '@ng-icons/lucide';
import { AuthService } from '@app/core/services/auth.service';
import { LanguageService } from '@app/core/services/language.service';
import { SessionService } from '@app/core/services/session.service';
import { BadgeComponent } from '@app/layout/components/badge/badge.component';
import { ShellStateService } from '@app/layout/services/shell-state.service';

/**
 * The account menu: who is signed in, the language switch, and the way out.
 *
 * The body of the right-hand drawer: who is signed in, the language switch, and the way out.
 */
@Component({
    selector: 'account-menu',
    imports: [NzAvatarModule, NzButtonModule, NzMenuModule, NzTooltipModule, TranslatePipe, NgIcon, BadgeComponent],
    providers: [provideIcons({ lucideCircleUser, lucideGlobe, lucideKeyRound, lucideKeyboard, lucideLogOut })],
    // The host draws no box of its own, so the menu stays the direct child of the CDK overlay.
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
