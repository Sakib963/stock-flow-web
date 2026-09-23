import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, debounce, delayWhen, map, of, switchMap, timer } from 'rxjs';
import { environment } from '@env/environment';
import { RequestFailure } from '@app/core/models/api.model';
import { JsonObject, Row } from '@app/core/models/config.model';
import { FilterValues } from '@app/core/models/filter.model';
import { Column, ListStoreSetup, TablePreferences, TableSort, TableState } from '@app/core/models/table.model';
import { LIST_DEFAULT_PAGE_SIZE, LIST_TIMING } from '@app/shared/constants/list-timing';
import { mergePreferences } from '@app/shared/utils/column-order/column-order';
import { resolveParams } from '@app/shared/utils/param-value/param-value';
import { isEmptyValue } from '@app/shared/utils/empty-value/empty-value';
import { readPath } from '@app/shared/utils/read-path/read-path';

type Outcome = { ok: true; body: unknown } | { ok: false; failure: RequestFailure; refused: boolean };

/** One namespace, so clearing site data for this app clears every table's preferences together. */
const PREFERENCES_PREFIX = 'sf.table.';

/**
 * Where a list remembers where someone was.
 *
 * sessionStorage, not localStorage and not the URL. Not the URL, because a link people paste and
 * bookmark should be the page, not one person's half-narrowed view of it. Not localStorage, because
 * a filter set on Tuesday must not still be hiding rows on Friday: the classic "the list is broken"
 * report that is really a filter nobody remembers setting. A tab is the right lifetime, so a reload
 * and a trip to a record and back come back to the same page, and a new tab starts clean.
 */
const STATE_PREFIX = 'sf.list.';

interface StoredState {
    page: number;
    size: number;
    sort: TableSort | null;
    search: string;
    filters: FilterValues;
}

/** Stored by an app that may be months behind this one, so every field is checked before it is used. */
const readStored = (raw: string | null): StoredState | null => {
    let parsed: unknown;
    try {
        parsed = raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;

    const state = parsed as Partial<StoredState>;
    const page = Number(state.page);
    const size = Number(state.size);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1) return null;

    const sort = state.sort && typeof state.sort.key === 'string' && (state.sort.order === 'asc' || state.sort.order === 'desc') ? state.sort : null;
    const filters = state.filters && typeof state.filters === 'object' ? state.filters : {};
    return { page, size, sort, search: typeof state.search === 'string' ? state.search : '', filters };
};

const classify = (error: HttpErrorResponse): RequestFailure => (error.status === 0 ? 'network' : error.status === 403 ? 'forbidden' : 'server');

/**
 * The state of one list and the only thing that loads it: page, size, sort, search and filters in,
 * rows, total, stats, totals and the table state out.
 *
 * Every trigger goes through one stream. Typing waits for 300ms of quiet, anything else 150ms, and
 * a newer request cancels the one in flight, so an old response can never land on top of a new
 * one. Once a loading state shows it stays 400ms, because a skeleton that flashes for 60ms reads
 * as a glitch. A refetch while rows are shown dims them instead of swapping in a skeleton.
 *
 * Provided per table, or once by the list shell page for the whole page.
 */
@Injectable()
export class ListStore {
    private readonly _http = inject(HttpClient);

    private _setup: ListStoreSetup | null = null;

    readonly page = signal(1);
    readonly size = signal<number>(LIST_DEFAULT_PAGE_SIZE.default);
    readonly sort = signal<TableSort | null>(null);
    readonly search = signal('');
    readonly filters = signal<FilterValues>({});

    readonly rows = signal<readonly Row[]>([]);
    readonly total = signal<number | null>(null);
    readonly stats = signal<JsonObject | null>(null);
    readonly totals = signal<JsonObject | null>(null);
    readonly state = signal<TableState>('loading');
    readonly failure = signal<RequestFailure | null>(null);

    readonly hasQuery = computed(() => this.search().trim() !== '' || Object.values(this.filters()).some((v) => !isEmptyValue(v)));

    private readonly _requests = new Subject<number>();

    constructor() {
        this._requests
            .pipe(
                debounce((wait) => timer(wait)),
                switchMap(() => this.fetch()),
                takeUntilDestroyed()
            )
            .subscribe((outcome) => this.apply(outcome));
    }

    /**
     * Layout, column order and hidden columns for one table, remembered on this device (REQ-23).
     * One state, so the picker, the layout switcher and every layout read the same thing.
     *
     * Reconciled with the config on every open, never replayed as stored: the config ships with the
     * app and this sits in a browser that may be months behind it.
     */
    readonly preferences = signal<TablePreferences>({ layout: 'table', order: [], hidden: [] });

    private _preferencesKey: string | null = null;

    configurePreferences(key: string, columns: readonly Column[], layouts: readonly string[], fallback: { layout: string }): void {
        this._preferencesKey = key;
        this.preferences.set(mergePreferences(columns, layouts, this.readPreferences(key), fallback));
    }

    /** Writes through, so a reload and a second tab agree without either watching the other. */
    setPreferences(next: TablePreferences): void {
        this.preferences.set(next);
        if (!this._preferencesKey) return;
        try {
            localStorage.setItem(`${PREFERENCES_PREFIX}${this._preferencesKey}`, JSON.stringify(next));
        } catch {
            // Storage blocked or full. The preference lasts for this page, which beats refusing the drag.
        }
    }

    private readPreferences(key: string): Partial<TablePreferences> | null {
        try {
            const raw = localStorage.getItem(`${PREFERENCES_PREFIX}${key}`);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            return parsed && typeof parsed === 'object' ? (parsed as Partial<TablePreferences>) : null;
        } catch {
            // Unreadable or not JSON: the config's own order is a better answer than a crash.
            return null;
        }
    }

    /** Points the store at its endpoint and loads straight away. */
    configure(setup: ListStoreSetup): void {
        const first = this._setup === null;
        this._setup = setup;
        if (first) {
            this.size.set(setup.pageSize ?? LIST_DEFAULT_PAGE_SIZE.default);
            this.sort.set(setup.sort ?? null);
            // After the config's own opening position, so what someone left behind wins over it,
            // and before the first request, so the list is never loaded twice to arrive there.
            this.restore();
        }
        this._requests.next(first ? 0 : LIST_TIMING.triggerDebounceMs);
    }

    private restore(): void {
        const key = this._setup?.key;
        if (!key) return;

        let stored: StoredState | null = null;
        try {
            stored = readStored(sessionStorage.getItem(`${STATE_PREFIX}${key}`));
        } catch {
            // Storage blocked. The config's opening position is a fine answer.
        }
        if (!stored) return;

        this.page.set(stored.page);
        this.size.set(stored.size);
        this.sort.set(stored.sort);
        this.search.set(stored.search);
        this.filters.set(stored.filters);
    }

    /** Drops what was remembered and returns to the config's opening position. False when there was nothing. */
    private forget(): boolean {
        const key = this._setup?.key;
        if (!key) return false;

        let had = false;
        try {
            had = sessionStorage.getItem(`${STATE_PREFIX}${key}`) !== null;
            sessionStorage.removeItem(`${STATE_PREFIX}${key}`);
        } catch {
            return false;
        }
        if (!had) return false;

        this.page.set(1);
        this.size.set(this._setup?.pageSize ?? LIST_DEFAULT_PAGE_SIZE.default);
        this.sort.set(this._setup?.sort ?? null);
        this.search.set('');
        this.filters.set({});
        return true;
    }

    /** Written on every change rather than on leaving, because nothing tells a page it is being left. */
    private remember(): void {
        const key = this._setup?.key;
        if (!key) return;

        const state: StoredState = { page: this.page(), size: this.size(), sort: this.sort(), search: this.search(), filters: this.filters() };
        try {
            sessionStorage.setItem(`${STATE_PREFIX}${key}`, JSON.stringify(state));
        } catch {
            // Storage blocked or full. The list still works; it just opens where the config says.
        }
    }

    setSearch(text: string): void {
        this.search.set(text);
        this.page.set(1);
        this.remember();
        this._requests.next(LIST_TIMING.searchDebounceMs);
    }

    setFilters(values: FilterValues): void {
        this.filters.set(values);
        this.page.set(1);
        this.remember();
        this._requests.next(LIST_TIMING.triggerDebounceMs);
    }

    setPage(page: number): void {
        this.page.set(page);
        this.remember();
        this._requests.next(LIST_TIMING.triggerDebounceMs);
    }

    setSize(size: number): void {
        this.size.set(size);
        this.page.set(1);
        this.remember();
        this._requests.next(LIST_TIMING.triggerDebounceMs);
    }

    setSort(sort: TableSort | null): void {
        this.sort.set(sort);
        this.page.set(1);
        this.remember();
        this._requests.next(LIST_TIMING.triggerDebounceMs);
    }

    reload(): void {
        this._requests.next(LIST_TIMING.triggerDebounceMs);
    }

    /** After a failure the table has nothing to dim, so a retry shows the skeleton again. */
    retry(): void {
        this.state.set('loading');
        this.failure.set(null);
        this._requests.next(0);
    }

    private fetch(): Observable<Outcome> {
        const setup = this._setup;
        if (!setup) return EMPTY;

        const started = Date.now();
        const current = this.state();
        this.state.set(current === 'data' || current === 'refreshing' || current === 'empty' || current === 'no-match' ? 'refreshing' : 'loading');

        return this._http.get<unknown>(`${environment.baseUrl}${setup.source.endpoint}`, { params: this.params(setup) }).pipe(
            map((body): Outcome => ({ ok: true, body })),
            catchError((error: HttpErrorResponse) => of<Outcome>({ ok: false, failure: classify(error), refused: error.status === 400 })),
            delayWhen(() => timer(Math.max(0, LIST_TIMING.minLoadingMs - (Date.now() - started))))
        );
    }

    private params(setup: ListStoreSetup): Record<string, string | number | boolean> {
        const params: Record<string, string | number | boolean> = {
            ...resolveParams(setup.source.params, { context: setup.context, route: setup.route }),
            offset: (this.page() - 1) * this.size(),
            limit: this.size(),
        };
        const search = this.search().trim();
        if (search) params['search'] = search;
        const sort = this.sort();
        if (sort) {
            params['sort'] = sort.key;
            params['order'] = sort.order;
        }
        for (const [key, value] of Object.entries(this.filters())) {
            if (!isEmptyValue(value)) params[key] = value as string;
        }
        if (setup.include?.length) params['include'] = setup.include.join(',');
        return params;
    }

    private apply(outcome: Outcome): void {
        if (!outcome.ok) {
            // A remembered sort key or filter that a release has since removed comes back as a 400,
            // and a retry would send exactly the same thing: the tab would be stuck on a list that
            // works everywhere else. Forget it once and open where the config says.
            if (outcome.refused && this.forget()) {
                this.retry();
                return;
            }
            this.failure.set(outcome.failure);
            this.state.set('error');
            return;
        }

        const response = this._setup?.source.response ?? {};
        const body = outcome.body;
        // The standard list shape is data.rows; an endpoint not yet moved to it answers data as the array.
        const rows = (readPath(body, response.rows ?? 'data.rows') ?? (Array.isArray(readPath(body, 'data')) ? readPath(body, 'data') : [])) as Row[];
        const total = Number(readPath(body, response.total ?? 'total') ?? rows.length);

        // A filter or a deletion can leave the page past the end: step back to the last real page.
        if (!rows.length && total > 0 && this.page() > 1) {
            this.page.set(Math.max(1, Math.ceil(total / this.size())));
            this.remember();
            this._requests.next(0);
            return;
        }

        this.failure.set(null);
        this.rows.set(rows);
        this.total.set(total);
        this.stats.set((readPath(body, response.stats ?? 'data.stats') as JsonObject) ?? null);
        this.totals.set((readPath(body, response.totals ?? 'data.totals') as JsonObject) ?? null);
        this.state.set(rows.length ? 'data' : this.hasQuery() ? 'no-match' : 'empty');
    }
}
