import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateService } from '@ngx-translate/core';
import { MenuItem } from '@app/core/models/session.model';
import { SessionService } from '@app/core/services/session.service';
import { ShellStateService } from '@app/layout/services/shell-state.service';

/**
 * The menu, and everything derived from it: which group is open, which one holds the page being
 * shown, and where a row goes when it is picked.
 *
 * Nothing about the navigation is authored here. The menu, its labels in both languages, its
 * icons, its order and whether an item is disabled all arrive in the boot payload, already
 * filtered to what this person may see, so there is nothing to filter and nothing to hide.
 *
 * The sider paints it, the search panel searches it and the shell primes it on a deep link, which
 * is why it is a service: three components asking the same questions of the same tree.
 */
@Injectable({ providedIn: 'root' })
export class ShellNavService {
    private readonly _router = inject(Router);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _state = inject(ShellStateService);
    readonly session = inject(SessionService);

    /**
     * One open group, not a set. Opening a second used to leave every group standing open, which
     * made the rail taller than the window and gave the eye nothing to land on.
     */
    readonly openGroup = signal<string | null>(null);

    /**
     * Which group the pointer is on, so the one shared flyout menu knows what to list.
     *
     * The panel itself is an nz-popover: the CDK anchors it to the row, flips it near the foot of
     * the window and bridges the gap between rail and panel. All three used to be hand-written,
     * and the hand-written versions were a getBoundingClientRect, a clamp and a close timer.
     */
    readonly hoverGroup = signal<MenuItem | null>(null);

    /** The URL as a signal, so "which group am I inside" is derived rather than stored. */
    readonly url = toSignal(
        this._router.events.pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd),
            map((e) => e.urlAfterRedirects)
        ),
        { initialValue: this._router.url }
    );

    /** The top-level group holding the page being shown, or null when the page sits at the root. */
    readonly activeGroup = computed(() => {
        const url = this.url();
        for (const item of this.session.menu()) {
            if (item.children.length && this.containsRoute(item, url)) return item.id;
        }
        return null;
    });

    /** Every navigable page, flattened. Groups are dropped: navigating to a header does nothing. */
    readonly leaves = computed(() => this.leavesOf(this.session.menu()));

    toggleGroup(id: string): void {
        this.openGroup.update((open) => (open === id ? null : id));
    }

    isOpen(id: string): boolean {
        return this.openGroup() === id;
    }

    /** Landing on a deep link should open the group that holds it, so the rail shows where the
     *  person is rather than making them find it. Once only: reasserting it on every navigation
     *  would fight anyone who closed the group on purpose. */
    primeOpenGroup(): void {
        this.openGroup.set(this.activeGroup());
    }

    go(item: MenuItem): void {
        if (item.isDisabled) return;

        // A jump from search or a flyout can land inside a group that is shut, and the rail should
        // show where the person just went.
        const group = this.groupContaining(item.id);
        if (group) this.openGroup.set(group);

        if (item.route) void this._router.navigateByUrl(item.route);
    }

    /**
     * Answers the tap on a feature that is present but not usable yet.
     *
     * The reason arrives from the server in both languages and used to live only in the native
     * `title`, which needs a pointer to hover. On a phone there is no hover, so tapping a disabled
     * row did nothing at all and the person was left to guess whether the app was broken. The
     * message says which language it is in by using the same copy the rest of the shell reads.
     */
    explainDisabled(item: MenuItem, event: Event): void {
        event.preventDefault();
        const reason = this.session.disabledMessage(item);
        this._message.info(reason || this._translate.instant('shell.soonReason'), { nzDuration: 4000 });
    }

    /**
     * The native tooltip for a nav row.
     *
     * Expanded, the label is already on screen, so the tooltip is the description. Collapsed, it
     * is not, so the label has to lead: without it the rail showed either a description with no
     * subject or, for a page with no description, nothing at all.
     */
    rowTitle(item: MenuItem): string {
        const detail = item.isDisabled ? this.session.disabledMessage(item) : this.session.description(item);
        if (!this._state.railCollapsed()) return detail;

        const label = this.session.label(item);
        return detail ? `${label}: ${detail}` : label;
    }

    /** A child route counts as its parent's page, so a detail screen keeps the rail where it was. */
    matchesRoute(route: string, url: string): boolean {
        const path = url.split(/[?#]/)[0];
        return path === route || path.startsWith(`${route}/`);
    }

    leavesOf(items: MenuItem[]): MenuItem[] {
        return items.flatMap((i) => (i.children.length ? this.leavesOf(i.children) : i.route ? [i] : []));
    }

    private containsRoute(item: MenuItem, url: string): boolean {
        if (item.route && this.matchesRoute(item.route, url)) return true;
        return item.children.some((c) => this.containsRoute(c, url));
    }

    private groupContaining(id: string): string | null {
        const holds = (items: MenuItem[]): boolean => items.some((i) => i.id === id || holds(i.children));
        for (const item of this.session.menu()) {
            if (item.children.length && holds(item.children)) return item.id;
        }
        return null;
    }
}
