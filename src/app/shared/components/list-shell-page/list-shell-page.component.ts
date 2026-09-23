import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ActionEvent, Tone } from '@app/core/models/config.model';
import { FilterValues } from '@app/core/models/filter.model';
import { ListShellPageConfig, Stat } from '@app/core/models/list-shell-page.model';
import { SessionService } from '@app/core/services/session/session.service';
import { FilterComponent } from '@app/shared/components/filter/filter.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { TableComponent } from '@app/shared/components/table/table.component';
import { LIST_ICONS, isListIcon } from '@app/shared/constants/list-icons';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';
import { ListStore } from '@app/shared/services/list-store/list-store.service';
import { isPhoneWidth, viewportWidth } from '@app/shared/utils/viewport/viewport';

/** The strip stays one row on a laptop, and the handoff caps it here. */
const MAX_STATS = 4;

const warnedStats = new Set<string>();

/** The icon bubble only. The number stays in normal ink, so four cards do not read as four alarms. */
const STAT_TONES: Record<Tone, string> = {
    success: 'bg-success-bg text-success-ink',
    warning: 'bg-warning-bg text-warning-ink',
    danger: 'bg-danger-bg text-danger-ink',
    progress: 'bg-primary-wash text-primary-8',
    neutral: 'bg-line-soft text-ink-muted',
};

/**
 * A list page from one config: the header, the search and filter fields, and the table, over a
 * single store.
 *
 * The store lives here rather than in the table, so the filter and the table cannot disagree about
 * what is applied, and one request feeds the header count, the rows and the footer totals. The
 * filter is projected into the table's own toolbar, which keeps the whole list in one card instead
 * of a filter band floating above it.
 *
 * List state is kept per tab by the store, so a reload or a trip to a record and back comes back
 * to the same page, sort and filters without any of it reaching the URL (REQ-12).
 *
 * Still owed: the slots.
 *
 *   <list-shell-page [config]="CATEGORY_LIST" (action)="onAction($event)" />
 */
@Component({
    selector: 'list-shell-page',
    imports: [NgTemplateOutlet, NgIcon, FilterComponent, PageHeaderComponent, TableComponent, MoneyPipe, TextPipe],
    providers: [ListStore, provideIcons(LIST_ICONS)],
    templateUrl: './list-shell-page.component.html',
    styleUrl: './list-shell-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListShellPageComponent {
    private readonly _route = inject(ActivatedRoute, { optional: true });
    private readonly _session = inject(SessionService);
    readonly store = inject(ListStore);

    /** From the host, or from the route's `data.config` when the route points straight at this page. */
    readonly config = input<ListShellPageConfig | null>(null);
    /** Values for `{ context: ... }` parameters: the record a page above this one is showing. */
    readonly context = input<Readonly<Record<string, unknown>> | null>(null);

    /** Anything the header or a row asks for that a config cannot run by itself. */
    readonly action = output<ActionEvent>();

    private readonly _routeConfig = (this._route?.snapshot.data['config'] as ListShellPageConfig | undefined) ?? null;

    readonly view = computed(() => this.config() ?? this._routeConfig);

    /** Defaults are the list's opening position, not a correction applied every time a page re-configures. */
    private _seeded = false;

    readonly isPhone = isPhoneWidth(viewportWidth());

    readonly total = this.store.total;

    readonly stats = computed(() => (this.view()?.stats ?? []).filter((stat) => !stat.permission || this._session.can(stat.permission)).slice(0, MAX_STATS));

    /**
     * The value beside each label, `null` until the server has sent it. Never 0 in its place: a
     * stat that reads zero while it is loading, or because the endpoint sends none, is a number
     * someone will act on.
     */
    readonly statCards = computed(() => {
        const values = this.store.stats();
        return this.stats().map((stat) => ({ ...stat, value: typeof values?.[stat.key] === 'number' ? (values[stat.key] as number) : null }));
    });

    /** A failed list has one answer, in the table. Cards left shimmering above it would be a second. */
    readonly showsStats = computed(() => this.statCards().length > 0 && this.store.state() !== 'error');

    /**
     * A list always starts by loading, so the header shows its placeholder from the first frame
     * rather than letting the count appear from nowhere one change detection later.
     */
    readonly countPending = computed(() => {
        const state = this.store.state();
        return state === 'loading' || state === 'refreshing';
    });

    constructor() {
        // A card whose number never arrives waits forever, and a placeholder says nothing about
        // whose fault that is. Once per table, after the rows have landed.
        effect(() => {
            const config = this.view();
            if (!config || this.store.state() === 'loading' || !this.stats().length) return;

            const missing = this.statCards().filter((stat) => stat.value === null);
            if (!missing.length || warnedStats.has(config.table.key)) return;
            warnedStats.add(config.table.key);
            console.warn(`[list-shell-page] "${config.table.key}" shows the stats ${missing.map((s) => s.key).join(', ')}, which its list response did not carry.`);
        });

        effect(() => {
            const config = this.view();
            const context = this.context();
            if (!config) return;

            untracked(() => {
                // A field's default is applied before the first request, so the list opens showing
                // what the config says it is about rather than everything and then narrowing. Once
                // only: a detail page swapping the record it shows must not undo the filters the
                // person set while reading it.
                if (!this._seeded) {
                    this._seeded = true;
                    const defaults = defaultFilters(config);
                    if (Object.keys(defaults).length) this.store.filters.set(defaults);
                }

                this.store.configure({
                    key: config.table.key,
                    source: config.table.source,
                    pageSize: config.table.pageSize?.default,
                    sort: config.table.sort ?? null,
                    context,
                    route: this._route?.snapshot.params,
                    include: [...(this.stats().length ? (['stats'] as const) : []), ...(config.table.totals?.length ? (['totals'] as const) : [])],
                });
            });
        });
    }

    onFilters(values: FilterValues): void {
        this.store.setFilters(values);
    }

    onSearch(text: string): void {
        this.store.setSearch(text);
    }

    toneClass(stat: Stat): string {
        return STAT_TONES[stat.tone ?? 'neutral'] ?? STAT_TONES.neutral;
    }

    iconOf(stat: Stat): string {
        return isListIcon(stat.icon) ? stat.icon : 'lucideInbox';
    }

    /** Applied over what is already there, so a card narrows the list rather than replacing the query. */
    onStat(stat: Stat): void {
        if (!stat.filter) return;
        this.store.setFilters({ ...this.store.filters(), ...stat.filter });
    }

    /**
     * The way back from a list that matched nothing: every filter and the search at once, in one
     * request rather than one per field cleared.
     */
    onReset(): void {
        const config = this.view();
        const kept: Record<string, string | null> = {};
        for (const field of config?.filter?.fields ?? []) if (field.required) kept[field.key] = this.store.filters()[field.key] ?? null;

        this.store.search.set('');
        this.store.setFilters(kept);
    }
}

/** A default is a string in the query string like any other value, so a list of them is joined. */
function defaultFilters(config: ListShellPageConfig): Record<string, string> {
    const values: Record<string, string> = {};
    for (const field of config.filter?.fields ?? []) {
        if (field.default === undefined) continue;
        values[field.key] = Array.isArray(field.default) ? field.default.join(',') : String(field.default);
    }
    return values;
}
