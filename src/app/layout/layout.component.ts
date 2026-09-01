import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
    lucideActivity,
    lucideBell,
    lucideBookOpen,
    lucideBoxes,
    lucideCalendarClock,
    lucideChartLine,
    lucideChevronDown,
    lucideChevronLeft,
    lucideCircleUser,
    lucideFactory,
    lucideFolder,
    lucideFolderTree,
    lucideGlobe,
    lucideHistory,
    lucideKeyRound,
    lucideLayers,
    lucideLayoutDashboard,
    lucideListTree,
    lucideLogOut,
    lucideMenu,
    lucidePanelLeftClose,
    lucidePanelLeftOpen,
    lucidePackage,
    lucideReceipt,
    lucideRows3,
    lucideScanBarcode,
    lucideSearch,
    lucideSettings,
    lucideSettings2,
    lucideShieldCheck,
    lucideShoppingCart,
    lucideStickyNote,
    lucideTag,
    lucideTerminal,
    lucideTrash2,
    lucideTruck,
    lucideUndo2,
    lucideUsers,
    lucideWarehouse,
    lucideX,
} from '@ng-icons/lucide';
import { AuthService } from '@app/core/services/auth.service';
import { LanguageService } from '@app/core/services/language.service';
import { SessionService } from '@app/core/services/session.service';
import { MenuItem } from '@app/core/models/session.model';
import { environment } from '@env/environment';

/**
 * The application shell.
 *
 * Header, sider and content region, built to the same design system as the auth screens. Nothing
 * about the navigation is written here: the menu, its labels in both languages, its icons, its
 * order and whether an item is disabled all arrive in the boot payload, already filtered to what
 * this person may see.
 *
 * Its geometry is what the boot skeleton in index.html imitates, so the two must change together:
 * header 56px, sider 240px expanded and 64px collapsed, gutter 24px by 28px.
 *
 * Every icon the menu can name must be registered here, because @ng-icons resolves at build time.
 * That is what bounds the icon palette to the list below, and why an unknown name falls back
 * rather than rendering nothing.
 */
@Component({
    selector: 'layout',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, TranslatePipe, NzButtonModule, NzInputModule, NzDropdownModule, NgIcon],
    providers: [
        provideIcons({
            lucideActivity,
            lucideBell,
            lucideBookOpen,
            lucideBoxes,
            lucideCalendarClock,
            lucideChartLine,
            lucideChevronDown,
            lucideChevronLeft,
            lucideCircleUser,
            lucideFactory,
            lucideFolder,
            lucideFolderTree,
            lucideGlobe,
            lucideHistory,
            lucideKeyRound,
            lucideLayers,
            lucideLayoutDashboard,
            lucideListTree,
            lucideLogOut,
            lucideMenu,
            lucidePanelLeftClose,
            lucidePanelLeftOpen,
            lucidePackage,
            lucideReceipt,
            lucideRows3,
            lucideScanBarcode,
            lucideSearch,
            lucideSettings,
            lucideSettings2,
            lucideShieldCheck,
            lucideShoppingCart,
            lucideStickyNote,
            lucideTag,
            lucideX,
            lucideTerminal,
            lucideTrash2,
            lucideTruck,
            lucideUndo2,
            lucideUsers,
            lucideWarehouse,
        }),
    ],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
    private readonly _auth = inject(AuthService);
    private readonly _router = inject(Router);
    readonly session = inject(SessionService);
    readonly language = inject(LanguageService);

    // A device preference, not user data, so it persists per machine rather than per session.
    readonly collapsed = signal(this.restoreCollapsed());
    // Phone only, and deliberately not persisted: a drawer that reopens itself on every load would
    // cover the page the person came back to.
    readonly mobileOpen = signal(false);
    readonly searchTerm = signal('');
    readonly openGroups = signal<Set<string>>(new Set());
    readonly version = environment.version;

    readonly results = computed(() => this.session.search(this.searchTerm()));

    constructor() {
        // Any completed navigation closes the drawer. Doing it here rather than on each link also
        // covers the search results, the browser back button and any future programmatic navigation.
        this._router.events
            .pipe(
                filter((e) => e instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => this.mobileOpen.set(false));
    }

    toggleMobile(): void {
        this.mobileOpen.update((open) => !open);
    }

    closeMobile(): void {
        this.mobileOpen.set(false);
    }

    /** Initials for the avatar, which is the only place a photo would otherwise be needed. */
    readonly initials = computed(() => {
        const name = this.session.user()?.name ?? '';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '?';
        return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    });

    toggleCollapsed(): void {
        this.collapsed.update((c) => !c);
        try {
            localStorage.setItem('sf_sider_collapsed', String(this.collapsed()));
        } catch {
            // Storage blocked. The sider still collapses, it just forgets next time.
        }
    }

    closeSearch(): void {
        this.searchTerm.set('');
    }

    private restoreCollapsed(): boolean {
        try {
            return localStorage.getItem('sf_sider_collapsed') === 'true';
        } catch {
            return false;
        }
    }

    toggleGroup(id: string): void {
        this.openGroups.update((open) => {
            const next = new Set(open);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    isOpen(id: string): boolean {
        return this.openGroups().has(id);
    }

    onSearch(term: string): void {
        this.searchTerm.set(term);
    }

    go(item: MenuItem): void {
        if (item.isDisabled) return;
        this.searchTerm.set('');
        if (item.route) void this._router.navigateByUrl(item.route);
    }

    signOut(): void {
        this.session.clear();
        this._auth.logout();
    }
}
