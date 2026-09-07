import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideChevronDown, lucideMenu, lucidePanelLeftClose, lucidePanelLeftOpen, lucideSearch, lucideStickyNote } from '@ng-icons/lucide';
import { SessionService } from '@app/core/services/session.service';
import { NotificationService } from '@app/core/services/notification.service';
import { AccountMenuComponent } from '@app/layout/components/account-menu/account-menu.component';
import { NotificationPanelComponent } from '@app/layout/components/notification-panel/notification-panel.component';
import { SearchPanelComponent } from '@app/layout/components/search-panel/search-panel.component';
import { ShellStateService } from '@app/layout/services/shell-state.service';

/**
 * The header bar: the brand block that continues the sider column up through the top of the
 * window, the collapse control, the search field, and the three triggers on the right.
 *
 * The panels those triggers open are their own components. This one owns only the triggers, which
 * is also why focus restoration lives here: the trigger elements are in this template, and a
 * dismissed panel has to hand focus back to the button it came from.
 */
@Component({
    selector: 'header-bar',
    imports: [NzBadgeModule, NzDropdownModule, NzTooltipModule, TranslatePipe, NgIcon, AccountMenuComponent, NotificationPanelComponent, SearchPanelComponent],
    providers: [provideIcons({ lucideBell, lucideChevronDown, lucideMenu, lucidePanelLeftClose, lucidePanelLeftOpen, lucideSearch, lucideStickyNote })],
    // The host draws no box of its own, so <header> stays the direct flex child of the shell.
    host: { class: 'contents' },
    templateUrl: './header-bar.component.html',
    styleUrl: './header-bar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderBarComponent {
    readonly state = inject(ShellStateService);
    readonly session = inject(SessionService);
    readonly notifications = inject(NotificationService);

    private readonly _accountTrigger = viewChild<ElementRef<HTMLButtonElement>>('accountTrigger');
    private readonly _bellTrigger = viewChild<ElementRef<HTMLButtonElement>>('bellTrigger');

    constructor() {
        // A dismissed panel puts focus back on the button that opened it. Only a dismissal: a
        // panel that closed because the page changed leaves focus where the navigation put it,
        // which is why the state service tells the two apart rather than this watching `openPanel`
        // fall to null.
        effect(() => {
            const panel = this.state.dismissed();
            if (!panel) return;

            if (panel === 'account') this._accountTrigger()?.nativeElement.focus();
            else if (panel === 'notifications') this._bellTrigger()?.nativeElement.focus();

            this.state.dismissed.set(null);
        });
    }
}
