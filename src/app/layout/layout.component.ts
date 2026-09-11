import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { TranslatePipe } from '@ngx-translate/core';
import { AccountMenuComponent } from '@app/layout/components/account-menu/account-menu.component';
import { HeaderBarComponent } from '@app/layout/components/header-bar/header-bar.component';
import { NotificationPanelComponent } from '@app/layout/components/notification-panel/notification-panel.component';
import { SearchPanelComponent } from '@app/layout/components/search-panel/search-panel.component';
import { SiderComponent } from '@app/layout/components/sider/sider.component';
import { ShortcutsDialogComponent } from '@app/layout/components/shortcuts-dialog/shortcuts-dialog.component';
import { NotificationService } from '@app/core/services/notification.service';
import { ShellNavService } from '@app/layout/services/shell-nav.service';
import { ShellSearchService } from '@app/layout/services/shell-search.service';
import { ShellStateService } from '@app/layout/services/shell-state.service';

/**
 * The application shell: the frame, the phone overlays, and the keys that work anywhere in the app.
 *
 * Everything with content of its own is a component beside this one. What is left here is what
 * genuinely belongs to the frame: the three-region geometry, the two ng-zorro overlays that only
 * exist below 768px, and the document-level key bindings, which have to be document-level because
 * Cmd+K must reach the search field from any page rather than only while the header holds focus.
 *
 * Its geometry is what the boot skeleton in index.html imitates, so the two must change together:
 * header 56px, sider 252px expanded and 64px collapsed, gutter 24px by 28px.
 */
@Component({
    selector: 'layout',
    imports: [RouterOutlet, NzDrawerModule, NzModalModule, TranslatePipe, HeaderBarComponent, SiderComponent, SearchPanelComponent, NotificationPanelComponent, AccountMenuComponent, ShortcutsDialogComponent],
    host: {
        class: 'block h-dvh',
        '(document:keydown)': 'onGlobalKey($event)',
    },
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
    private readonly _router = inject(Router);

    readonly state = inject(ShellStateService);
    readonly nav = inject(ShellNavService);
    readonly notifications = inject(NotificationService);
    readonly search = inject(ShellSearchService);

    private _primed = false;

    constructor() {
        this._router.events
            .pipe(
                filter((e) => e instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                // Landing on a deep link should open the group that holds it, so the rail shows
                // where the person is rather than making them find it. It waits for the first
                // completed navigation because `router.url` is still the previous page while the
                // shell is being activated. Once only: reasserting it on every navigation would
                // fight anyone who closed the group on purpose.
                if (!this._primed) {
                    this._primed = true;
                    this.nav.primeOpenGroup();
                }

                // Any completed navigation closes the drawer and any open panel. Doing it here
                // rather than on each link also covers the browser back button, a search result
                // and any future programmatic navigation.
                this.state.closeMobile();
                this.state.closePanelForNavigation();
                this.search.reset();
                this.search.recordRecent();
            });
    }

    onGlobalKey(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();

        if (event.metaKey || event.ctrlKey) {
            if (key === 'k') {
                event.preventDefault();
                this.search.requestFocus();
            } else if (key === 'b') {
                event.preventDefault();
                this.state.toggleCollapsed();
            }
            return;
        }

        if (event.key === 'Escape') {
            // The ng-zorro overlays close themselves on Escape. This covers the two states the
            // shell owns, and it is why the order matters: a dialog over a panel closes first.
            if (this.state.shortcutsOpen()) this.state.closeShortcuts();
            else if (this.state.openPanel()) this.closePanel();
            return;
        }

        // A bare key, so it must not fire while someone is typing a question mark into a field.
        if (event.key === '?' && !this.isTyping(event)) {
            event.preventDefault();
            this.state.openShortcuts();
        }
    }

    /** Escape and the overlay both land here, so both leave the shell in the same state. */
    closePanel(): void {
        if (this.state.openPanel() === 'search') this.search.reset();
        this.state.closePanel();
    }

    private isTyping(event: KeyboardEvent): boolean {
        const el = event.target as HTMLElement | null;
        return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
    }
}
