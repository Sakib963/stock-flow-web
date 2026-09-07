import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideX } from '@ng-icons/lucide';
import { MenuItem } from '@app/core/models/session.model';
import { MENU_ICON_FALLBACK, SHELL_MENU_ICONS } from '@app/layout/constants/shell-icons';
import { BadgeComponent } from '@app/layout/components/badge/badge.component';
import { ShellNavService } from '@app/layout/services/shell-nav.service';
import { ShellStateService } from '@app/layout/services/shell-state.service';
import { environment } from '@env/environment';

/**
 * The rail on a wide window, the drawer body on a phone. One definition either way: the menu is
 * the same menu, and only the box around it changes.
 *
 * Hand-rolled rather than `nz-menu`, and deliberately. The design puts the active marker in the
 * sider gutter outside the rounded row, gives a shut group that holds the active page a second
 * shorter marker, and ties a group's children together with a downward-fading rule closed off by a
 * dot. `.ant-menu-item` brings its own selected marker and `.ant-menu-inline` its own width and
 * margin arithmetic, so expressing this through nz-menu means unwriting more of ant than the rail
 * costs to write. The overlays it does use, the group flyout and the collapsed-row tooltip, are
 * ng-zorro: those are exactly the parts that were hand-written once and turned into a
 * getBoundingClientRect, a clamp and a close timer.
 */
@Component({
    selector: 'sider',
    imports: [RouterLink, RouterLinkActive, NzPopoverModule, NzTooltipModule, TranslatePipe, NgIcon, BadgeComponent],
    providers: [provideIcons({ ...SHELL_MENU_ICONS, lucideChevronDown, lucideX })],
    // The host draws no box of its own, so `.shell__sider` stays the direct flex child of the
    // shell body, and the drawer body's child on a phone.
    host: { class: 'contents' },
    templateUrl: './sider.component.html',
    styleUrl: './sider.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiderComponent {
    readonly state = inject(ShellStateService);
    readonly nav = inject(ShellNavService);

    readonly session = this.nav.session;
    readonly version = environment.version;
    readonly iconFallback = MENU_ICON_FALLBACK;

    /**
     * The tones a rail row takes, as opposed to the shape it always has.
     *
     * These are methods rather than more utilities in the template because each row picks one of
     * three mutually exclusive states, and a template that spelled all three out inline would
     * repeat forty classes per row across four kinds of row. The shape stays in the template where
     * it can be read; only the choice between states lives here.
     *
     * The active row has to be obvious from across a counter, so it is a fill plus a bar, not an
     * underline. The bar itself is a pseudo-element in the stylesheet: it sits in the sider gutter
     * outside the rounded row, which is why it cannot be a utility on any element.
     */
    railClasses(item: MenuItem, isActive = false): string {
        const width = this.state.railCollapsed() ? 'justify-center px-0 w-[calc(100%-16px)] mx-2' : 'mx-2 pr-2.5 pl-3';

        if (isActive) return `${width} is-active bg-primary text-white shadow-active`;

        // Present but not usable. Still legible: greying it into illegibility is the same as
        // hiding it, and this person is allowed to reach it, just not yet.
        if (item.isDisabled) return `${width} is-disabled cursor-not-allowed text-n-500`;

        const open = this.nav.isOpen(item.id) && item.children.length ? 'bg-primary-open' : '';
        return `${width} ${open} text-n-800 hover:bg-primary-tint hover:text-n-900`.trim();
    }

    iconClasses(item: MenuItem, isActive = false): string {
        if (isActive) return 'text-white';
        if (item.isDisabled) return 'text-n-400';
        return 'text-sider-icon group-hover:text-primary';
    }

    /** No icon on a child: the rule plus a marker on it is what says "child", and an icon as well
     *  made the rail noisy without adding meaning. The marker is a pseudo-element. */
    childClasses(child: MenuItem, isActive = false): string {
        if (isActive) return 'is-active bg-primary text-white shadow-active';
        if (child.isDisabled) return 'is-disabled cursor-not-allowed text-n-500';
        return 'text-n-800 hover:bg-primary-tint hover:text-n-900';
    }

    flyoutClasses(child: MenuItem, isActive = false): string {
        if (isActive) return 'is-active bg-primary text-white shadow-active';
        if (child.isDisabled) return 'is-disabled cursor-not-allowed text-n-500';
        return 'text-n-800 hover:bg-primary-tint hover:text-n-900';
    }
}
