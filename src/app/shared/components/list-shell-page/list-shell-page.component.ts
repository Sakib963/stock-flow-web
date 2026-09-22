import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionEvent } from '@app/core/models/config.model';
import { FilterValues } from '@app/core/models/filter.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { FilterComponent } from '@app/shared/components/filter/filter.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { TableComponent } from '@app/shared/components/table/table.component';
import { ListStore } from '@app/shared/services/list-store/list-store.service';
import { isPhoneWidth, viewportWidth } from '@app/shared/utils/viewport/viewport';

/**
 * A list page from one config: the header, the search and filter fields, and the table, over a
 * single store.
 *
 * The store lives here rather than in the table, so the filter and the table cannot disagree about
 * what is applied, and one request feeds the header count, the rows and the footer totals. The
 * filter is projected into the table's own toolbar, which keeps the whole list in one card instead
 * of a filter band floating above it.
 *
 * Still owed: the stat cards, the slots, and list state in the URL (REQ-12).
 *
 *   <list-shell-page [config]="CATEGORY_LIST" (action)="onAction($event)" />
 */
@Component({
    selector: 'list-shell-page',
    imports: [FilterComponent, PageHeaderComponent, TableComponent],
    providers: [ListStore],
    templateUrl: './list-shell-page.component.html',
    styleUrl: './list-shell-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListShellPageComponent {
    private readonly _route = inject(ActivatedRoute, { optional: true });
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

    /**
     * A list always starts by loading, so the header shows its placeholder from the first frame
     * rather than letting the count appear from nowhere one change detection later.
     */
    readonly countPending = computed(() => {
        const state = this.store.state();
        return state === 'loading' || state === 'refreshing';
    });

    constructor() {
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
                    source: config.table.source,
                    pageSize: config.table.pageSize?.default,
                    sort: config.table.sort ?? null,
                    context,
                    route: this._route?.snapshot.params,
                    include: config.table.totals?.length ? ['totals'] : [],
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
