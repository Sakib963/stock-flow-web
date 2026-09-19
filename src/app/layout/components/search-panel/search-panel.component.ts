import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideCommand, lucideCornerDownLeft, lucideSearch, lucideX } from '@ng-icons/lucide';
import { MENU_ICON_FALLBACK, SHELL_MENU_ICONS } from '@app/layout/constants/shell-icons';
import { BadgeComponent } from '@app/layout/components/badge/badge.component';
import { ShellNavService } from '@app/layout/services/shell-nav/shell-nav.service';
import { ShellSearchService } from '@app/layout/services/shell-search/shell-search.service';
import { ShellStateService } from '@app/layout/services/shell-state/shell-state.service';

/**
 * The header search: the field, and the results hanging off it.
 *
 * One component in two containers: the field in the header with an anchored panel below it on a
 * wide window, and the body of an ng-zorro modal on a phone. Exactly one is ever mounted, which is
 * what lets the field carry a single view reference.
 */
@Component({
    selector: 'search-panel',
    imports: [NgTemplateOutlet, FormsModule, NzInputModule, TranslatePipe, NgIcon, BadgeComponent],
    providers: [provideIcons({ ...SHELL_MENU_ICONS, lucideArrowDown, lucideArrowUp, lucideCommand, lucideCornerDownLeft, lucideSearch, lucideX })],
    host: {
        class: 'contents',
        '(document:mousedown)': 'onOutsidePointer($event)',
    },
    templateUrl: './search-panel.component.html',
    styleUrl: './search-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPanelComponent implements AfterViewInit {
    /** `inline` is the header field and its dropdown; `sheet` is the phone modal body. */
    readonly variant = input<'inline' | 'sheet'>('inline');

    readonly state = inject(ShellStateService);
    readonly search = inject(ShellSearchService);
    readonly nav = inject(ShellNavService);

    readonly session = this.nav.session;
    readonly iconFallback = MENU_ICON_FALLBACK;

    private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly _field = viewChild<ElementRef<HTMLInputElement>>('searchInput');

    constructor() {
        effect(() => {
            const requested = this.search.focusRequest();
            if (requested) this.focusField();
        });
    }

    ngAfterViewInit(): void {
        if (this.variant() === 'sheet') this.focusField();
    }

    /**
     * Shuts the inline panel when the pointer goes down outside it. The panel is anchored by hand
     * rather than through the CDK, so nothing else is listening for this. The sheet is excluded
     * because ng-zorro's modal handles its own dismissal.
     */
    onOutsidePointer(event: MouseEvent): void {
        if (this.variant() !== 'inline' || this.state.openPanel() !== 'search') return;
        if (this._host.nativeElement.contains(event.target as Node)) return;

        this.search.reset();
        this.state.closePanel();
    }

    /**
     * Deferred a tick. The field can mount in the same change detection pass that opened the
     * panel, and focus applied before it is laid out lands nowhere.
     */
    focusField(): void {
        setTimeout(() => {
            const input = this._field()?.nativeElement;
            input?.focus();
            input?.select();
        });
    }
}
