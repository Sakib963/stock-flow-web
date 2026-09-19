import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HeaderPanel } from '@app/core/models/shell.model';

// The width at which the sider stops being a rail and becomes a drawer. It is duplicated in the
// shell stylesheets because a media query cannot read a TypeScript constant; the two are a pair,
// and changing one without the other puts the components and the stylesheets into different
// layouts at the same width.
const PHONE_QUERY = '(max-width: 767px)';

const COLLAPSED_KEY = 'sf_sider_collapsed';

const matchesPhone = (): boolean => {
    try {
        return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;
    } catch {
        return false;
    }
};

/**
 * Whether this is an Apple keyboard, which decides whether the key cap reads the command glyph or
 * Ctrl.
 *
 * The platform, not the user-agent string: "mac" turns up inside unrelated UA tokens, and a
 * Windows machine that guesses Apple puts a symbol on the cap that is not on the keyboard. The
 * pattern is anchored for the same reason. `userAgentData` is the supported replacement for the
 * deprecated `platform`, and is not in every browser yet, so both are read.
 */
const isApplePlatform = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const agent = navigator as Navigator & { userAgentData?: { platform?: string } };
    return /^(mac|ipad|iphone|ipod)/i.test(agent.userAgentData?.platform || agent.platform || '');
};

/**
 * The shell chrome: how wide the rail is, which width the app is being used at, and which one
 * overlay is open.
 *
 * It is a service rather than state on the shell component because four separate components read
 * it. The header needs to know whether it is drawing a hamburger or a collapse control, the sider
 * needs to know whether it is a rail or a drawer body, and both panels need to know whether their
 * container is an anchored dropdown or a full-width sheet. Threading that down as inputs would put
 * the same three values through every template in the shell.
 *
 * Nothing here knows what is in the menu. That is `ShellNavService`.
 */
@Injectable({ providedIn: 'root' })
export class ShellStateService {
    private readonly _destroyRef = inject(DestroyRef);

    // A device preference, not user data, so it persists per machine rather than per session.
    readonly collapsed = signal(this.restoreCollapsed());

    /** Below 768px the sider is a drawer, not a rail, which changes what "collapsed" can mean. */
    private readonly _phone = signal(matchesPhone());

    /** Which container each overlay gets: an anchored dropdown, or an ng-zorro sheet. */
    readonly isPhone = this._phone.asReadonly();

    // Phone only, and deliberately not persisted: a drawer that reopens itself on every load would
    // cover the page the person came back to.
    readonly mobileOpen = signal(false);

    readonly openPanel = signal<HeaderPanel | null>(null);
    readonly shortcutsOpen = signal(false);
    readonly sessionsOpen = signal(false);

    /**
     * The panel the person just dismissed, as opposed to one that closed because the page changed.
     *
     * Only a dismissal returns focus to the trigger it came from. A navigation closes the panel
     * too, and moving focus back to the bell after the page has changed underneath would take the
     * person somewhere they did not ask to go. The header reads this and clears it.
     */
    readonly dismissed = signal<HeaderPanel | null>(null);

    /**
     * Whether the rail is actually a narrow icon column right now.
     *
     * `collapsed` is the stored preference and says nothing about the width the app is being used
     * at. Below 768px there is no rail to narrow: the sider is a full-width drawer, so a stored
     * "collapsed" from a desktop session must not follow the person onto their phone. It used to,
     * which is why groups on a phone opened onto nothing.
     */
    readonly railCollapsed = computed(() => this.collapsed() && !this._phone());

    // The key cap is drawn with the glyph the person's own keyboard has: a Mac user pressing Ctrl
    // gets nothing, and a Windows user has no command key to press.
    readonly isMac = isApplePlatform();
    readonly modifier = this.isMac ? '⌘' : 'Ctrl';

    // Strings rather than bindings to a signal: ng-zorro reads these once when the overlay is
    // created, and both are viewport-relative anyway.
    readonly drawerWidth = 'min(300px, calc(100vw - 48px))';
    readonly sheetWidth = 'calc(100vw - 24px)';
    /** The notifications and account drawers, which come in from the right at every width. */
    readonly panelWidth = 'min(380px, calc(100vw - 32px))';

    constructor() {
        // The rail and the drawer are different components of the same sider, and which one is on
        // screen is a width question the stylesheets already answer. This is the app asking the
        // same question, because the open and shut behaviour differs between the two.
        const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(PHONE_QUERY) : null;
        const onChange = (e: MediaQueryListEvent) => this._phone.set(e.matches);
        query?.addEventListener?.('change', onChange);

        this._destroyRef.onDestroy(() => query?.removeEventListener?.('change', onChange));
    }

    /* Rail ------------------------------------------------------------------- */

    toggleCollapsed(): void {
        this.collapsed.update((c) => !c);
        try {
            localStorage.setItem(COLLAPSED_KEY, String(this.collapsed()));
        } catch {
            // Storage blocked. The sider still collapses, it just forgets next time.
        }
    }

    toggleMobile(): void {
        // The drawer covers the whole screen on a phone, header included, so a panel left open
        // behind it would be stacked underneath with no way to reach or dismiss it.
        this.openPanel.set(null);
        this.mobileOpen.update((open) => !open);
    }

    closeMobile(): void {
        this.mobileOpen.set(false);
    }

    /* Panels ----------------------------------------------------------------- */

    openSearchPanel(): void {
        this.mobileOpen.set(false);
        this.openPanel.set('search');
    }

    /** One value, so opening any panel is also the act of closing whichever one was open. */
    togglePanel(panel: HeaderPanel): void {
        this.mobileOpen.set(false);
        this.openPanel.update((open) => (open === panel ? null : panel));
    }

    /**
     * Syncs a panel that ng-zorro is driving.
     *
     * The dropdown handles its own trigger, its outside click and its Escape, so the shell
     * follows it rather than fighting it for control of the same boolean. Guarded both ways so
     * that writing the state cannot bounce another event straight back.
     */
    onPanelVisible(panel: HeaderPanel, visible: boolean): void {
        if (visible) {
            if (this.openPanel() !== panel) this.togglePanel(panel);
        } else if (this.openPanel() === panel) {
            this.openPanel.set(null);
        }
    }

    /** Escape and the overlay both land here, so both leave the shell in the same state. */
    closePanel(): void {
        const open = this.openPanel();
        this.openPanel.set(null);
        this.dismissed.set(open);
    }

    /** A navigation closes any open panel, and that does not count as a dismissal. */
    closePanelForNavigation(): void {
        this.openPanel.set(null);
    }

    openShortcuts(): void {
        this.openPanel.set(null);
        this.shortcutsOpen.set(true);
    }

    closeShortcuts(): void {
        this.shortcutsOpen.set(false);
        // The dialog is opened from the account menu, so that is where focus goes back to.
        this.dismissed.set('account');
    }

    openSessions(): void {
        this.openPanel.set(null);
        this.sessionsOpen.set(true);
    }

    closeSessions(): void {
        this.sessionsOpen.set(false);
        this.dismissed.set('account');
    }

    private restoreCollapsed(): boolean {
        try {
            return localStorage.getItem(COLLAPSED_KEY) === 'true';
        } catch {
            return false;
        }
    }
}
