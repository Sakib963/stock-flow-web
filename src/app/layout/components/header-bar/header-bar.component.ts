import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideChevronDown, lucideMenu, lucidePanelLeftClose, lucidePanelLeftOpen, lucideSearch, lucideStickyNote } from '@ng-icons/lucide';
import { SessionService } from '@app/core/services/session.service';
import { NotificationService } from '@app/core/services/notification.service';
import { SearchPanelComponent } from '@app/layout/components/search-panel/search-panel.component';
import { ShellStateService } from '@app/layout/services/shell-state.service';

/**
 * The header bar: the brand block, the collapse control, and the triggers on the right.
 *
 * Notifications and the account menu are drawers owned by the shell, so this holds their triggers
 * only. Search is different: its field lives here. Focus restoration is here because the trigger
 * elements are, and a dismissed panel has to hand focus back to the button it came from.
 */
@Component({
    selector: 'header-bar',
    imports: [NzAvatarModule, NzTooltipModule, TranslatePipe, NgIcon, SearchPanelComponent],
    providers: [provideIcons({ lucideBell, lucideChevronDown, lucideMenu, lucidePanelLeftClose, lucidePanelLeftOpen, lucideSearch, lucideStickyNote })],
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
        // Only a dismissal returns focus. A panel that closed because the page changed leaves
        // focus where the navigation put it.
        effect(() => {
            const panel = this.state.dismissed();
            if (!panel) return;

            if (panel === 'account') this._accountTrigger()?.nativeElement.focus();
            else if (panel === 'notifications') this._bellTrigger()?.nativeElement.focus();

            this.state.dismissed.set(null);
        });
    }
}
