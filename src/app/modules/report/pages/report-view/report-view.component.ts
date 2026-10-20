import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideFileSpreadsheet, lucideInbox, lucidePrinter, lucideRotateCw } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription, map } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FilterConfig, FilterField, FilterValues } from '@app/core/models/filter.model';
import { ReportColumn, ReportFilter, ReportGroup, ReportResult, ReportRow } from '@app/core/models/report.model';
import { Column, TableConfig } from '@app/core/models/table.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ADJUSTMENT_REASONS, DISPOSE_REASONS, REPORTS, REPORT_PERMISSION } from '@app/modules/report/config/reports.config';
import { ReportService } from '@app/modules/report/services/report.service';
import { printReport } from '@app/modules/report/utils/print-report';
import { FilterComponent } from '@app/shared/components/filter/filter.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { TableComponent } from '@app/shared/components/table/table.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { addDays, businessToday } from '@app/shared/utils/business-time/business-time';
import { saveDownload } from '@app/shared/utils/download-file/download-file';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { isPhoneWidth, viewportWidth } from '@app/shared/utils/viewport/viewport';

type Failure = 'network' | 'forbidden' | 'server' | 'tooBig';

/** Stored codes the screen shows as words, by column type. Everything else is drawn as it comes. */
const CODED = new Set(['gender', 'age_band', 'customer_status', 'campaign_status', 'pre_order_status', 'courier', 'channel', 'payment_method', 'payment_type', 'payment_status', 'purchase_payment', 'return_reason', 'batch_status', 'dispose_reason', 'adjustment_reason', 'yes_no']);

/** The width a column's values need, in pixels of the 1366 wide table (about 1060 across). */
const TABLE_PX = 1060;
const COLUMN_PX: Partial<Record<ReportColumn['type'], number>> = { text: 240, code: 140, day: 110, money: 130, int: 95, percent: 85, yes_no: 90 };
const CODED_PX = 140;
/** Print holds every row on paper, so past this the Excel file is the copy to keep. */
const PRINT_LIMIT = 5000;

/** A report's column as the shared table draws it: codes as identifiers, days as dates, counts as numbers. */
const tableColumn = (column: ReportColumn, report: string, width: number, hidden: boolean): Column => {
    const label = column.key === 'day' ? `report.reports.${report}.day` : `report.column.${column.key}`;
    const base = { key: column.key, label, width, hidden, sortable: false };
    switch (column.type) {
        case 'day':
            return { ...base, type: 'date' };
        case 'money':
            return { ...base, type: 'money' };
        case 'int':
            return { ...base, type: 'number' };
        case 'percent':
            return { ...base, type: 'percent' };
        case 'code':
            return { ...base, type: 'identifier' };
        default:
            return { ...base, type: 'text' };
    }
};

/**
 * One report: its filters, the totals above the rows, the rows on the shared table, and Excel and
 * Print for someone who may export. The figures and which columns exist are the server's; this page
 * only draws them and pages through them locally, since the server sends the whole report at once.
 */
@Component({
    selector: 'report-view',
    imports: [NgIcon, NzButtonModule, NzSkeletonModule, NzTooltipModule, TranslatePipe, MoneyPipe, RecordDatePipe, FilterComponent, PageHeaderComponent, TableComponent],
    providers: [provideIcons({ lucideCircleAlert, lucideFileSpreadsheet, lucideInbox, lucidePrinter, lucideRotateCw })],
    templateUrl: './report-view.component.html',
    styleUrl: './report-view.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportViewComponent {
    private readonly _reports = inject(ReportService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _route = inject(ActivatedRoute);
    private readonly _money = new MoneyPipe();
    private readonly _date = new RecordDatePipe();
    readonly language = inject(LanguageService).current;
    readonly isPhone = isPhoneWidth(viewportWidth());

    readonly group = toSignal(this._route.data.pipe(map((data) => data['group'] as ReportGroup)), { requireSync: true });
    readonly key = toSignal(this._route.paramMap.pipe(map((params) => params.get('report') ?? '')), { requireSync: true });
    /** Null for a key no report has, or one needing a permission the person lacks. */
    readonly definition = computed(() => REPORTS[this.group()].find((r) => r.key === this.key() && (!r.requires || this._session.can(r.requires))) ?? null);
    readonly canExport = computed(() => this._session.can(REPORT_PERMISSION[this.group()].export));

    readonly filters = signal<FilterValues>({ date_from: addDays(businessToday(), 1 - Number(businessToday().slice(8))), date_to: businessToday() });

    readonly result = signal<ReportResult | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<Failure | null>(null);
    readonly downloading = signal(false);
    readonly printing = signal(false);
    private _load?: Subscription;

    readonly filterConfig = computed<FilterConfig>(() => ({ render: 'row', chips: false, fields: (this.definition()?.filters ?? []).flatMap((f) => this._field(f)) }));

    /** What the server is asked: only the filters this report takes, so a period never narrows an as-at-now report. */
    readonly query = computed(() => {
        const keys = new Set(this.filterConfig().fields.flatMap((f) => (f.type === 'date-range' ? [f.fromKey, f.toKey] : [f.key])));
        return Object.fromEntries(Object.entries(this.filters()).filter(([key]) => keys.has(key)));
    });

    readonly page = signal({ page: 1, size: 25 });
    /** A new filter draws a new table, which opens on its first page; turning a page keeps it. */
    readonly filterKey = computed(() => JSON.stringify(this.query()));

    /**
     * Each column at a width its values fit, as a share of a desktop table, stretched to fill the card.
     * A wide report opens with its key columns and the rest are picked from Columns, since the shared
     * table never opens scrolling sideways; Excel and print carry every column.
     */
    readonly table = computed<TableConfig>(() => {
        const columns = this.result()?.columns ?? [];
        const hidden = new Set(this.definition()?.hidden ?? []);
        const shares = columns.map((c) => COLUMN_PX[c.type] ?? CODED_PX);
        const sum = shares.reduce((total, px, i) => total + (hidden.has(columns[i].key) ? 0 : px), 0) || 1;
        const scale = sum < TABLE_PX ? 100 / sum : 100 / TABLE_PX;
        return {
            key: `report.${this.key()}`,
            rowKey: '__row',
            columns: columns.map((c, i) => tableColumn(c, this.key(), shares[i] * scale, hidden.has(c.key))),
            layouts: [{ type: 'table' }],
            personalise: { hide: true, reorder: false },
            pageSize: { default: 25, options: [25, 50, 100] },
            empty: { icon: 'lucideInbox', title: `report.reports.${this.key()}.emptyTitle`, body: this.filterConfig().fields.length ? 'report.emptyBody' : 'report.emptyBodyNow' },
        };
    });

    /** The page on screen, codes as words in the person's language; recomputed when the language changes. */
    readonly rows = computed<ReportRow[]>(() => {
        this.language();
        const result = this.result();
        return result ? this._shown(result, (this.page().page - 1) * this.page().size) : [];
    });

    readonly totals = computed(() => {
        const result = this.result();
        if (!result) return [];
        const extra = (this.definition()?.extraTotals ?? []).map((key) => ({ key, label: `report.total.${key}`, type: 'int' as const }));
        const summed = result.columns.filter((c) => c.total).map((c) => ({ key: c.key, label: `report.column.${c.key}`, type: c.type }));
        return [...extra, ...summed].filter((t) => result.totals[t.key] !== undefined).map((t) => ({ ...t, value: this._format(t.type, result.totals[t.key]) }));
    });

    readonly withoutCost = computed(() => this.result()?.totals['units_without_cost'] ?? 0);
    readonly printTooMany = computed(() => (this.result()?.row_count ?? 0) > PRINT_LIMIT);

    constructor() {
        effect(() => {
            const query = this.query();
            const page = this.page();
            const definition = this.definition();
            untracked(() => this._run(definition ? query : null, page));
        });
        inject(DestroyRef).onDestroy(() => this._load?.unsubscribe());
    }

    setFilters(values: FilterValues): void {
        this.filters.set(values);
        this.page.update((p) => ({ ...p, page: 1 }));
    }

    reload(): void {
        this._run(this.query(), this.page());
    }

    download(): void {
        if (this.downloading()) return;
        this.downloading.set(true);
        this._reports.download(this.group(), this.key(), this.query()).subscribe({
            next: (response) => {
                saveDownload(response, `${this.key()}.xlsx`);
                this.downloading.set(false);
            },
            error: (error: unknown) => {
                this.downloading.set(false);
                this._message.error(this._translate.instant(`report.downloadFailed.${this._failureOf(error)}`));
            },
        });
    }

    /** Every row is fetched only now, 5,000 at most, since the screen holds one page. */
    print(): void {
        if (this.printing()) return;
        this.printing.set(true);
        this._reports.run(this.group(), this.key(), { ...this.query(), offset: '0', limit: String(PRINT_LIMIT) }).subscribe({
            next: (result) => {
                this.printing.set(false);
                this._print(result);
            },
            error: (error: unknown) => {
                this.printing.set(false);
                this._message.error(this._translate.instant(`report.downloadFailed.${this._failureOf(error)}`));
            },
        });
    }

    private _print(result: ReportResult): void {
        const t = (key: string, params?: Record<string, string>) => this._translate.instant(key, params) as string;
        const columns = this.table().columns.map((c) => ({ key: c.key, label: t(c.label as string), numeric: ['money', 'number', 'percent'].includes(c.type) }));
        const serial = { key: '#', label: '#', numeric: true };
        const period = result.period ? t('report.periodLine', { from: this._date.transform(result.period.date_from, this.language()), to: this._date.transform(result.period.date_to, this.language()) }) : t('report.asAtNow');
        printReport({
            business: this._session.business()?.name ?? '',
            title: t(`report.reports.${this.key()}.title`),
            lines: [period, t('report.madeOn', { when: this._date.transform(new Date().toISOString(), this.language(), 'date-time-12') })],
            columns: [serial, ...columns],
            rows: this._shown(result, 0).map((row, i) => [this._money.transform(i + 1, 'number'), ...columns.map((c) => this._cell(c.key, row[c.key]))]),
            totals: this.totals().map((total) => [t(total.label), total.value]),
            note: t(`report.reports.${this.key()}.note`),
        });
    }

    private _shown(result: ReportResult, offset: number): ReportRow[] {
        const coded = result.columns.filter((c) => CODED.has(c.type));
        return result.rows.map((row, i) => {
            const shown: Record<string, string | number | boolean | null> = { ...row, __row: offset + i };
            for (const c of coded) if (row[c.key] !== null && row[c.key] !== undefined) shown[c.key] = this._translate.instant(`report.value.${c.type}.${row[c.key]}`);
            return shown;
        });
    }

    private _cell(key: string, value: string | number | boolean | null): string {
        const column = this.result()?.columns.find((c) => c.key === key);
        return column ? this._format(column.type, value) : String(value ?? '');
    }

    private _format(type: ReportColumn['type'], value: string | number | boolean | null | undefined): string {
        if (value === null || value === undefined || value === '') return '-';
        if (type === 'money' || type === 'int') return this._money.transform(Number(value), 'number');
        if (type === 'percent') return `${this._money.transform(Number(value), 'number')}%`;
        if (type === 'day') return this._date.transform(value, this.language());
        return String(value);
    }

    private _run(query: Record<string, string | null> | null, page: { page: number; size: number }): void {
        this._load?.unsubscribe();
        if (!query) {
            this.loading.set(false);
            return;
        }
        this.loading.set(true);
        this.failed.set(null);
        this._load = this._reports.run(this.group(), this.key(), { ...query, offset: String((page.page - 1) * page.size), limit: String(page.size) }).subscribe({
            next: (result) => {
                this.result.set(result);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.result.set(null);
                this.loading.set(false);
                this.failed.set(this._failureOf(error));
            },
        });
    }

    /** A report refused as too big says so; the server words it, but the screen speaks both languages. */
    private _failureOf(error: unknown): Failure {
        return error instanceof HttpErrorResponse && error.status === 400 ? 'tooBig' : failureOf(error);
    }

    private _field(filter: ReportFilter): FilterField[] {
        const label = `report.filter.${filter}`;
        switch (filter) {
            case 'period':
                return [{ key: 'when', label, type: 'date-range', fromKey: 'date_from', toKey: 'date_to', presets: ['today', 'yesterday', 'this-month', 'last-month', 'last-7-days', 'last-30-days'], max: 'today', maxDays: 366 }];
            case 'channel':
                // Only for someone who sells both ways: one channel needs no choice.
                return this._session.can('sales.pos.view') && this._session.can('sales.online.view')
                    ? [{ key: 'channel', label, type: 'select', choices: [{ value: 'POS', label: 'report.value.channel.POS' }, { value: 'ONLINE', label: 'report.value.channel.ONLINE' }] }]
                    : [];
            case 'category':
                return [{ key: 'category_oid', label, type: 'select', permission: 'configuration.category.view', choices: { endpoint: APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN } }];
            case 'warehouse':
                return [{ key: 'warehouse_oid', label, type: 'select', permission: 'configuration.warehouse.view', choices: { endpoint: APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN } }];
            case 'supplier':
                return [{ key: 'supplier_oid', label, type: 'select', permission: 'configuration.supplier.view', choices: { endpoint: APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN } }];
            case 'dispose-reason':
                return [{ key: 'reason', label, type: 'select', choices: DISPOSE_REASONS.map((r) => ({ value: r, label: `report.value.dispose_reason.${r}` })) }];
            case 'expires-by':
                return [{ key: 'within_days', label, type: 'select', choices: ['30', '60', '90', '180'].map((days) => ({ value: days, label: `report.value.within_days.${days}` })) }];
            case 'customer-status':
                return [{ key: 'status', label, type: 'select', choices: ['Active', 'Inactive'].map((value) => ({ value, label: `report.value.customer_status.${value}` })) }];
            case 'gender':
                return [{ key: 'gender', label, type: 'select', choices: ['Female', 'Male'].map((value) => ({ value, label: `report.value.gender.${value}` })) }];
            case 'age-band':
                return [{ key: 'age_band', label, type: 'select', choices: ['under_18', '18_24', '25_34', '35_44', '45_plus'].map((value) => ({ value, label: `report.value.age_band.${value}` })) }];
            case 'quiet-days':
                return [{ key: 'quiet_days', label, type: 'select', choices: ['60', '90', '180'].map((value) => ({ value, label: `report.value.quiet_days.${value}` })) }];
            case 'campaign-status':
                return [{ key: 'status', label, type: 'select', choices: ['Planned', 'Live', 'Completed', 'Cancelled'].map((value) => ({ value, label: `report.value.campaign_status.${value}` })) }];
            case 'adjustment-reason':
                return [{ key: 'reason', label, type: 'select', choices: ADJUSTMENT_REASONS.map((r) => ({ value: r, label: `report.value.adjustment_reason.${r}` })) }];
        }
    }
}
