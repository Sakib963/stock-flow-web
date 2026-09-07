import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideCommand, lucideCornerDownLeft, lucideSearch, lucideX } from '@ng-icons/lucide';
import { MENU_ICON_FALLBACK, SHELL_MENU_ICONS } from '@app/layout/constants/shell-icons';
import { BadgeComponent } from '@app/layout/components/badge/badge.component';
import { ShellNavService } from '@app/layout/services/shell-nav.service';
import { ShellSearchService } from '@app/layout/services/shell-search.service';
import { ShellStateService } from '@app/layout/services/shell-state.service';

/**
 * The header search: the field, and the results hanging off it.
 *
 * One component in two containers. On a wide window it is the field in the header with an anchored
 * panel below it; on a phone it is the body of an ng-zorro modal, with the field in the sheet head.
 * The variants are separate templates rather than one template with properties undone one at a
 * time: the phone sheet used to reuse the dropdown's own container class and unset its properties,
 * and the one that got missed, a 340px min-width meant for a desktop popover, pushed every row
 * wider than the screen.
 *
 * Exactly one of the two is ever mounted, which is what lets the field carry a single view
 * reference. The shell asks for focus through the service rather than reaching for that reference,
 * because it cannot know which variant is on screen.
 */
@Component({
    selector: 'search-panel',
    imports: [NgTemplateOutlet, FormsModule, NzInputModule, TranslatePipe, NgIcon, BadgeComponent],
    providers: [provideIcons({ ...SHELL_MENU_ICONS, lucideArrowDown, lucideArrowUp, lucideCommand, lucideCornerDownLeft, lucideSearch, lucideX })],
    // The host draws no box of its own, so the field stays the direct flex child of the header
    // bar, and the sheet the direct child of the modal body.
    host: { class: 'contents' },
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

    private readonly _field = viewChild<ElementRef<HTMLInputElement>>('searchInput');

    constructor() {
        effect(() => {
            // Read first so the effect tracks it even on the run that does nothing.
            const requested = this.search.focusRequest();
            if (requested) this.focusField();
        });
    }

    ngAfterViewInit(): void {
        // The sheet mounts because the panel opened, so its field takes focus without being asked.
        if (this.variant() === 'sheet') this.focusField();
    }

    /**
     * Deferred by a tick. The field can be mounting in the same change detection pass that opened
     * the panel, and focus applied before it is laid out lands nowhere, taking the on-screen
     * keyboard with it.
     */
    focusField(): void {
        setTimeout(() => {
            const input = this._field()?.nativeElement;
            input?.focus();
            input?.select();
        });
    }
}
