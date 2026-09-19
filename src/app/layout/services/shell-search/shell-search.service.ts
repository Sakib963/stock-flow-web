import { Injectable, computed, inject, signal } from '@angular/core';
import { MenuItem } from '@app/core/models/session.model';
import { RawSearchGroup, SearchGroup } from '@app/core/models/shell.model';
import { SessionService } from '@app/core/services/session/session.service';
import { ShellNavService } from '@app/layout/services/shell-nav/shell-nav.service';
import { ShellStateService } from '@app/layout/services/shell-state/shell-state.service';

const RECENT_KEY = 'sf_recent_pages';
const RECENT_LIMIT = 5;

/**
 * The header search: what was typed, what matched, and which row the arrow keys are on.
 *
 * It is a service rather than state on the panel component because the panel is rendered twice,
 * once as an anchored dropdown and once inside a phone sheet, and because the shell records a
 * visited page on every navigation whether the panel has ever been opened or not.
 */
@Injectable({ providedIn: 'root' })
export class ShellSearchService {
    private readonly _session = inject(SessionService);
    private readonly _nav = inject(ShellNavService);
    private readonly _state = inject(ShellStateService);

    readonly term = signal('');

    /** Which search row the arrow keys are on. */
    readonly cursor = signal(0);

    private readonly _recentIds = signal<string[]>(this.restoreRecent());

    /**
     * Bumped when something asks for the field, which is how Cmd+K reaches an input it cannot see.
     *
     * The field is rendered by the header on a wide window and by the phone sheet below 768px,
     * never both, so the shortcut has no single element to hold a reference to. A counter rather
     * than a boolean because two presses in a row must both land.
     */
    readonly focusRequest = signal(0);

    /** Opens the panel and asks whichever copy of the field is mounted to take focus. */
    requestFocus(): void {
        this._state.openSearchPanel();
        this.focusRequest.update((n) => n + 1);
    }

    /**
     * Matches grouped by the section they live under.
     *
     * The panel is specified against orders, customers and products, which no endpoint serves yet:
     * `SessionService.search` knows only the menu. So the sections here are the menu's own, which
     * is the honest version of the same shape. When a combined search endpoint lands, the record
     * groups join these and nothing about the markup changes.
     */
    private readonly _matched = computed<RawSearchGroup[]>(() => {
        const term = this.term().trim();
        if (!term) return [];

        const matched = new Set(this._session.search(term).map((i) => i.id));
        if (!matched.size) return [];

        const groups: RawSearchGroup[] = [];
        const loose: MenuItem[] = [];

        for (const item of this._session.menu()) {
            if (item.children.length) {
                const hits = this._nav.leavesOf(item.children).filter((c) => matched.has(c.id));
                if (hits.length) groups.push({ id: item.id, label: this._session.label(item), labelKey: null, items: hits });
            } else if (matched.has(item.id)) {
                loose.push(item);
            }
        }

        // A top-level page has no section above it, so those lead the panel under one heading
        // rather than each one inventing a group of its own.
        return loose.length ? [{ id: '__general', label: null, labelKey: 'shell.searchGeneral', items: loose }, ...groups] : groups;
    });

    /** Where the person has actually been, so the idle panel is useful rather than decorative. */
    private readonly _recent = computed<RawSearchGroup[]>(() => {
        const byId = new Map(this._nav.leaves().map((i) => [i.id, i]));
        const items = this._recentIds()
            .map((id) => byId.get(id))
            .filter((i): i is MenuItem => !!i);
        return items.length ? [{ id: '__recent', label: null, labelKey: 'shell.recent', items }] : [];
    });

    /** What the panel shows: matches once something is typed, recents while the field is empty. */
    readonly groups = computed<SearchGroup[]>(() => {
        const raw = this.term().trim() ? this._matched() : this._recent();
        let index = 0;
        return raw.map((g) => ({
            id: g.id,
            label: g.label,
            labelKey: g.labelKey,
            count: g.items.length,
            rows: g.items.map((item) => ({ item, index: index++ })),
        }));
    });

    /** Flat, in the order they are painted, which is the order the arrow keys walk. */
    readonly rows = computed(() => this.groups().flatMap((g) => g.rows.map((r) => r.item)));

    /** Something was typed and nothing matched, which is a different panel from the idle one. */
    readonly noMatch = computed(() => !!this.term().trim() && !this._matched().length);

    /**
     * Up to three tags that actually matched, so a row hit by a synonym says why it is there.
     *
     * Matching covers tags as well as labels and descriptions, so "godown" finds Warehouses with
     * nothing on the row explaining the connection. Only the tags that matched: the rest are noise.
     */
    matchedTags(item: MenuItem): string[] {
        const tokens = this.term().trim().toLowerCase().split(/s+/).filter(Boolean);
        if (!tokens.length) return [];
        return item.tags.filter((tag) => tokens.some((token) => tag.toLowerCase().includes(token))).slice(0, 3);
    }

    onSearch(term: string): void {
        this.term.set(term);
        this.cursor.set(0);
        this._state.openPanel.set('search');
    }

    /** Leaves the field as it was found, for a panel that is closing rather than navigating. */
    reset(): void {
        this.term.set('');
        this.cursor.set(0);
    }

    onSearchKey(event: KeyboardEvent): void {
        // Escape leaves the field focused with the panel shut. Enter must not open whatever the
        // cursor was last on when there is nothing on screen to say what that is.
        if (this._state.openPanel() !== 'search') return;

        const rows = this.rows();
        if (!rows.length) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.cursor.update((i) => (i + 1) % rows.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.cursor.update((i) => (i - 1 + rows.length) % rows.length);
        } else if (event.key === 'Enter') {
            const item = rows[this.cursor()];
            if (item) {
                event.preventDefault();
                this.go(item);
            }
        }
    }

    go(item: MenuItem): void {
        if (item.isDisabled) return;
        this.reset();
        this._state.openPanel.set(null);
        this._nav.go(item);
    }

    /**
     * Remembers the page just opened, newest first, so the idle search panel shows real history
     * rather than a guess at what someone might want.
     */
    recordRecent(): void {
        const url = this._nav.url();
        const page = this._nav.leaves().find((i) => i.route && this._nav.matchesRoute(i.route, url));
        if (!page) return;

        const next = [page.id, ...this._recentIds().filter((id) => id !== page.id)].slice(0, RECENT_LIMIT);
        this._recentIds.set(next);
        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
            // Storage blocked. Recents still work for this session, they just do not survive it.
        }
    }

    private restoreRecent(): string[] {
        try {
            const raw = localStorage.getItem(RECENT_KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, RECENT_LIMIT) : [];
        } catch {
            return [];
        }
    }
}
