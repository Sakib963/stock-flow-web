import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideChevronDown, lucideGlobe, lucideMenu, lucidePanelLeftClose, lucidePanelLeftOpen, lucidePlus, lucideSearch, lucideStickyNote, lucideStore } from '@ng-icons/lucide';
import { SessionService } from '@app/core/services/session/session.service';
import { NotificationService } from '@app/core/services/notification/notification.service';
import { SearchPanelComponent } from '@app/layout/components/search-panel/search-panel.component';
import { ShellStateService } from '@app/layout/services/shell-state/shell-state.service';

/**
 * The header bar: the brand block, the collapse control, and the triggers on the right.
 *
 * Notifications and the account menu are drawers owned by the shell, so this holds their triggers
 * only. Search is different: its field lives here. Focus restoration is here because the trigger
 * elements are, and a dismissed panel has to hand focus back to the button it came from.
 */
@Component({
    selector: 'header-bar',
    imports: [RouterLink, NzAvatarModule, NzButtonModule, NzDropdownModule, NzTooltipModule, TranslatePipe, NgIcon, SearchPanelComponent],
    providers: [provideIcons({ lucideBell, lucideChevronDown, lucideGlobe, lucideMenu, lucidePanelLeftClose, lucidePanelLeftOpen, lucidePlus, lucideSearch, lucideStickyNote, lucideStore })],
    host: { class: 'contents' },
    templateUrl: './header-bar.component.html',
    styleUrl: './header-bar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderBarComponent {
    readonly state = inject(ShellStateService);
    readonly session = inject(SessionService);
    readonly notifications = inject(NotificationService);

    /** Opening a counter is not enough: someone who may only look products up there gets no shortcut. */
    readonly newOrderTargets = computed(() => {
        const sells = (prefix: string) => this.session.can(`${prefix}.view`) && this.session.can(`${prefix}.create`);
        return [
            ...(sells('sales.pos') ? [{ route: '/app/sales/pos', label: 'shell.counterSale', icon: 'lucideStore' }] : []),
            ...(sells('sales.online') ? [{ route: '/app/sales/online-order', label: 'shell.onlineOrder', icon: 'lucideGlobe' }] : []),
        ];
    });

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
