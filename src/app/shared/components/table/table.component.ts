import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { TranslatePipe } from '@ngx-translate/core';
import { fromEvent, map } from 'rxjs';
import { ActionEvent, Row } from '@app/core/models/config.model';
import { LayoutContext } from '@app/core/models/renderer.model';
import { Layout, RowAction, TableConfig, TablePreferences, TableSort, TableState } from '@app/core/models/table.model';
import { SessionService } from '@app/core/services/session/session.service';
import { RendererOutletComponent } from '@app/shared/components/renderer-outlet/renderer-outlet.component';
import { ColumnPickerComponent } from '@app/shared/components/table/components/column-picker/column-picker.component';
import { TableLayoutComponent } from '@app/shared/components/table/components/table-layout/table-layout.component';
import { LIST_ICONS, isListIcon } from '@app/shared/constants/list-icons';
import { LIST_DEFAULT_PAGE_SIZE } from '@app/shared/constants/list-timing';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';
import { ListStore } from '@app/shared/services/list-store/list-store.service';
import { moveColumn, visibleColumns } from '@app/shared/utils/column-order/column-order';
import { matches } from '@app/shared/utils/condition/condition';
import { fillRoute } from '@app/shared/utils/fill-route/fill-route';

const PHONE_MAX = 767;

/** A layout's stable name: the built-ins are known by their type, a registered one by its key. */
const layoutKey = (layout: Layout): string => (layout.type === 'component' ? layout.key : layout.type);

/**
 * The table: rows from a config, in the current layout, with their states and the footer.
 *
 * It loads by itself when its config has a `source`, through a ListStore it provides; under a list
 * shell page it uses the page's store instead; with neither, the host passes rows, total and state.
 * Before any layout sees the rows, columns and actions the person lacks are gone, so a registered
 * layout cannot show what the built-in one would hide. Loading, empty, no-match and failure are
 * drawn here, around the layout, so a new layout gets all four for free.
 *
 *   <list-table [config]="SUPPLIER_PURCHASE_ORDERS" [context]="supplierContext()" />
 */
@Component({
    selector: 'list-table',
    imports: [NgIcon, NzButtonModule, NzPaginationModule, TranslatePipe, TextPipe, MoneyPipe, ColumnPickerComponent, TableLayoutComponent, RendererOutletComponent],
    providers: [ListStore, provideIcons(LIST_ICONS)],
    templateUrl: './table.component.html',
    styleUrl: './table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent {
    private readonly _session = inject(SessionService);
    private readonly _router = inject(Router);
    private readonly _route = inject(ActivatedRoute, { optional: true });
    private readonly _pageStore = inject(ListStore, { skipSelf: true, optional: true });
    private readonly _ownStore = inject(ListStore, { self: true });

    readonly config = input.required<TableConfig>();
    /** Values for `{ context: ... }` params: the record a detail page is showing. */
    readonly context = input<Readonly<Record<string, unknown>> | null>(null);
    /** Only without a source: the host loads. */
    readonly rows = input<readonly Row[] | null>(null);
    readonly total = input<number | null>(null);
    readonly state = input<TableState | null>(null);

    readonly action = output<ActionEvent>();
    /** Only without a source: the host reloads for these. */
    readonly pageChange = output<{ page: number; size: number }>();
    readonly sortChange = output<TableSort | null>();

    /** The page's store when a list shell page provides one, else this table's own. */
    readonly store = this._pageStore ?? this._ownStore;
    readonly loads = computed(() => !!this._pageStore || !!this.config().source);

    private readonly _width = toSignal(fromEvent(window, 'resize').pipe(map(() => window.innerWidth)), { initialValue: window.innerWidth });
    readonly isPhone = computed(() => this._width() <= PHONE_MAX);

    private readonly _hostPage = signal(1);
    private readonly _hostSize = signal<number | null>(null);
    private readonly _hostSort = signal<TableSort | null>(null);

    readonly viewRows = computed(() => (this.loads() ? this.store.rows() : (this.rows() ?? [])));
    readonly viewTotal = computed(() => (this.loads() ? this.store.total() : this.total()));
    readonly viewState = computed<TableState>(() => (this.loads() ? this.store.state() : (this.state() ?? (this.rows() ? (this.rows()!.length ? 'data' : 'empty') : 'loading'))));

    readonly pageSizes = computed(() => this.config().pageSize ?? LIST_DEFAULT_PAGE_SIZE);
    readonly sizeOptions = computed(() => [...this.pageSizes().options]);
    readonly page = computed(() => (this.loads() ? this.store.page() : this._hostPage()));
    readonly size = computed(() => (this.loads() ? this.store.size() : (this._hostSize() ?? this.pageSizes().default)));
    readonly sort = computed(() => (this.loads() ? this.store.sort() : this._hostSort()));

    /** Every column this person may see. What the picker offers, before their own choices apply. */
    readonly permittedColumns = computed(() => this.config().columns.filter((c) => !c.permission || this._session.can(c.permission)));

    readonly preferences = this.store.preferences;

    readonly personalise = computed(() => {
        const set = this.config().personalise ?? {};
        return { hide: set.hide !== false, reorder: set.reorder !== false };
    });

    readonly showsPicker = computed(() => (this.personalise().hide || this.personalise().reorder) && this.permittedColumns().some((c) => !c.pin));

    /**
     * What a layout draws: permitted, shown, in the person's order, minus what is too narrow to fit.
     *
     * `hideBelow` is applied last and is not a preference: it answers the window, so a column
     * dropped at 700px comes back at 1400px without touching what the person chose.
     */
    readonly columns = computed(() => {
        const width = this._width();
        return visibleColumns(this.permittedColumns(), this.preferences()).filter((c) => !(c.hideBelow && width < c.hideBelow));
    });

    private readonly _rowActions = computed(() => (this.config().rowActions ?? []).filter((a) => this._session.can(a.permission)));

    readonly layout = computed(() => this.config().layouts.find((l) => (!l.permission || this._session.can(l.permission)) && (l.type === 'table' || l.type === 'component')) ?? { type: 'table' as const });

    readonly showsFooter = computed(() => {
        const state = this.viewState();
        return (state === 'data' || state === 'refreshing') && (this.viewTotal() ?? 0) > 0;
    });

    readonly range = computed(() => {
        const total = this.viewTotal() ?? 0;
        const from = total ? (this.page() - 1) * this.size() + 1 : 0;
        return { from, to: Math.min(total, this.page() * this.size()), total };
    });

    readonly totals = computed(() => {
        const values = this.store.totals();
        return (this.config().totals ?? []).map((t) => ({ ...t, value: values?.[t.key] ?? null }));
    });

    readonly failureCopy = computed(() => {
        const failure = this.store.failure();
        if (failure === 'forbidden') return { title: 'list.forbiddenTitle', body: 'list.forbiddenBody', icon: 'lucideLock', retry: false };
        if (failure === 'network') return { title: 'list.errorTitle', body: 'list.networkBody', icon: 'lucideWifiOff', retry: true };
        return { title: 'list.errorTitle', body: 'list.serverBody', icon: 'lucideCircleAlert', retry: true };
    });

    readonly emptyIcon = computed(() => (isListIcon(this.config().empty.icon) ? this.config().empty.icon : 'lucideInbox'));

    readonly layoutContext: LayoutContext = {
        rows: this.viewRows,
        columns: this.columns,
        state: this.viewState,
        density: computed(() => this.preferences().density),
        selection: null,
        sort: this.sort,
        setSort: (sort) => this.setSort(sort),
        actionsFor: (row) => this.actionsFor(row),
        run: (key, row) => this.run(key, row),
        open: (row) => this.open(row),
    };

    constructor() {
        // The stored preferences are reconciled with the config every time the table gets one, not
        // once at construction: a table whose config is swapped (a report changing entity) would
        // otherwise keep the previous list's column order.
        effect(() => {
            const config = this.config();
            const columns = this.permittedColumns();
            untracked(() => this.store.configurePreferences(config.key, columns, config.layouts.map(layoutKey), { layout: layoutKey(this.layout()), density: config.density ?? 'compact' }));
        });

        effect(() => {
            const config = this.config();
            const context = this.context();
            if (this._pageStore || !config.source) return;
            untracked(() =>
                this._ownStore.configure({
                    source: config.source!,
                    pageSize: config.pageSize?.default,
                    sort: config.sort ?? null,
                    context,
                    route: this._route?.snapshot.params,
                    include: config.totals?.length ? ['totals'] : [],
                })
            );
        });
    }

    openRoute(): string | null {
        return this.config().open?.route ?? null;
    }

    /** A header drag competes with a horizontal scroll on a phone, where the table is already scrolling. */
    readonly canDragHeaders = computed(() => this.personalise().reorder && !this.isPhone());

    onReorder(move: { from: number; to: number }): void {
        this.store.setPreferences({ ...this.preferences(), order: moveColumn(this.permittedColumns(), this.preferences().order, move.from, move.to) });
    }

    /** Through the store, never straight onto the signal, so the choice survives the next load. */
    onPreferences(next: TablePreferences): void {
        this.store.setPreferences(next);
    }

    /** Stateful actions need the server's word that the row's state allows them; missing data fails closed. */
    actionsFor(row: Row): readonly RowAction[] {
        const allowed = Array.isArray(row['allowed_actions']) ? (row['allowed_actions'] as string[]) : null;
        return this._rowActions().filter((a) => (a.stateful === false || !!allowed?.includes(a.key)) && (!a.when || matches(a.when, row)));
    }

    run(key: string, row: Row): void {
        const action = this.actionsFor(row).find((a) => a.key === key);
        if (!action) return;
        if (action.run.kind === 'navigate') {
            const route = fillRoute(action.run.route, row);
            if (route) void this._router.navigateByUrl(route);
            return;
        }
        this.action.emit({ action, rows: [row] });
    }

    open(row: Row): void {
        const route = this.config().open?.route;
        const filled = route ? fillRoute(route, row) : null;
        if (filled) void this._router.navigateByUrl(filled);
    }

    onPage(page: number): void {
        if (this.loads()) this.store.setPage(page);
        else {
            this._hostPage.set(page);
            this.pageChange.emit({ page, size: this.size() });
        }
    }

    onSize(size: number): void {
        if (this.loads()) this.store.setSize(size);
        else {
            this._hostSize.set(size);
            this._hostPage.set(1);
            this.pageChange.emit({ page: 1, size });
        }
    }

    retry(): void {
        this.store.retry();
    }

    setSort(sort: TableSort | null): void {
        if (this.loads()) this.store.setSort(sort);
        else {
            this._hostSort.set(sort);
            this.sortChange.emit(sort);
        }
    }
}
