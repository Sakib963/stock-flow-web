import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideCircleUser, lucideGlobe, lucideKeyRound, lucideKeyboard, lucideLogOut, lucideMonitorSmartphone } from '@ng-icons/lucide';
import { AuthService } from '@app/core/services/auth/auth.service';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ShellStateService } from '@app/layout/services/shell-state/shell-state.service';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';

/** The body of the right-hand drawer: who is signed in, the language switch, and the ways out. */
@Component({
    selector: 'account-menu',
    imports: [RouterLink, StatusTagComponent, NzAvatarModule, NzButtonModule, NzMenuModule, TranslatePipe, NgIcon],
    providers: [provideIcons({ lucideChevronRight, lucideCircleUser, lucideGlobe, lucideKeyRound, lucideKeyboard, lucideLogOut, lucideMonitorSmartphone })],
    // The host draws no box of its own, so the menu stays the direct child of the CDK overlay.
    host: { class: 'contents' },
    templateUrl: './account-menu.component.html',
    styleUrl: './account-menu.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenuComponent {
    private readonly _auth = inject(AuthService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);

    readonly state = inject(ShellStateService);
    readonly session = inject(SessionService);
    readonly language = inject(LanguageService);

    confirmSignOut(): void {
        // The button stays busy until the server has answered. Nothing about the session is forgotten before that.
        confirmAction(this._modal, {
            title: this._translate.instant('shell.signOutTitle'),
            body: this._translate.instant('shell.signOutBody'),
            ok: this._translate.instant('shell.signOut'),
            cancel: this._translate.instant('shell.cancel'),
            danger: true,
            icon: 'lucideLogOut',
            run: () => this.signOut(),
        }).subscribe();
    }

    /** `false` keeps the confirmation open: the session is still live, and the way to try again is
     *  the button they already pressed. */
    private async signOut(): Promise<boolean> {
        try {
            await this._auth.signOut();
            // Only once the sign-in page is showing. Clearing first emptied the shell while it was
            // still on screen, and on a slow connection it stayed that way.
            this.session.clear();
            return true;
        } catch (error) {
            // Only a failed request keeps them here. Anything else has already forgotten the session
            // and moved them on, and a message about still being signed in would be a lie.
            if (!(error instanceof HttpErrorResponse)) throw error;

            this._message.error(this._translate.instant(error.status === 0 ? 'shell.signOutUnreachable' : 'shell.signOutFailed'), { nzDuration: 6000 });
            return false;
        }
    }
}
