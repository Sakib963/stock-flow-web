import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBanknote, lucideChartColumn, lucideCircleCheck, lucideClock, lucideFileSpreadsheet, lucideHandCoins, lucideHistory, lucideInfo, lucidePackage, lucidePackageMinus, lucidePencil, lucideReceipt, lucideRotateCw, lucideShoppingCart, lucideTrendingUp, lucideTriangleAlert, lucideTruck, lucideWallet, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { Supplier, SupplierDetails, SupplierReport } from '@app/core/models/supplier.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { SUPPLIER_STATUS } from '@app/modules/configuration/supplier/config/supplier-list.config';
import { PageBack } from '@app/core/models/page-header.model';
import { SUPPLIER_ROUTES } from '@app/modules/configuration/supplier/constants/supplier-routes';
import { SupplierService } from '@app/modules/configuration/supplier/services/supplier.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { saveDownload } from '@app/shared/utils/download-file/download-file';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

/** One number on the record page. `unit` is `%` or a copy key; `note` is a line of context under it. */
interface SupplierStat {
    key: string;
    label: string;
    value: number | null;
    icon: string;
    format: 'money' | 'number';
    unit?: string;
    alert?: boolean;
    note?: { key: string; count: number; money?: boolean } | null;
}

/**
 * One supplier, read only. The record itself comes first, because it is what someone opened the
 * page to see; the numbers after it are the ones they would otherwise work out by counting.
 */
@Component({
    selector: 'supplier-detail',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTimelineModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, MoneyPipe, RecordDatePipe, DigitsPipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBanknote, lucideChartColumn, lucideCircleCheck, lucideClock, lucideFileSpreadsheet, lucideHandCoins, lucideHistory, lucideInfo, lucidePackage, lucidePackageMinus, lucidePencil, lucideReceipt, lucideRotateCw, lucideShoppingCart, lucideTrendingUp, lucideTriangleAlert, lucideTruck, lucideWallet, lucideZap })],
    templateUrl: './supplier-detail.component.html',
    styleUrl: './supplier-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _suppliers = inject(SupplierService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';

    /** The list's row for this supplier, when the page was opened from the list. */
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: SUPPLIER_ROUTES.list };
    readonly record = signal<SupplierDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    /** What the details card draws: the full record once it is here, the list's row until then. */
    readonly supplier = computed<Partial<Supplier> | null>(() => this.record()?.details ?? this._seed);

    readonly canEdit = computed(() => this._session.can('configuration.supplier.edit'));

    /**
     * Reports are their own permission, not part of view.
     *
     * Opening a supplier and taking its whole product catalogue out of the building are different
     * acts, so someone may be able to read this page and not to export it. The server checks the
     * same code on both endpoints; this only decides whether the buttons are there at all.
     */
    readonly canExport = computed(() => this._session.can('configuration.supplier.export'));

    /** Which report is downloading, so only that button shows it and neither can be pressed twice. */
    readonly downloading = signal<SupplierReport | null>(null);

    readonly reports: readonly { kind: SupplierReport; label: string }[] = [
        { kind: 'performance', label: 'configuration.supplier.report.performance' },
        { kind: 'data', label: 'configuration.supplier.report.data' },
    ];

    /** Links into pages not ported yet, disabled with the reason under them. */
    readonly comingActions: readonly { key: string; label: string; icon: string }[] = [
        { key: 'purchaseOrders', label: 'configuration.supplier.quick.purchaseOrders', icon: 'lucideShoppingCart' },
        { key: 'products', label: 'configuration.supplier.quick.products', icon: 'lucidePackage' },
    ];

    readonly tone = computed(() => {
        const status = this.supplier()?.status;
        return status ? resolveTone(SUPPLIER_STATUS, status, undefined, 'the supplier status')?.style : null;
    });

    /**
     * Two strips: what was bought and is owed, then how it arrived and how it sells. A rate the
     * server could not work out is null and shows as not enough data, never as 0%.
     */
    readonly statGroups = computed<{ key: string; title: string; icon: string; stats: SupplierStat[] }[]>(() => {
        const s = this.record()?.stats;
        if (!s) return [];
        return [
            {
                key: 'money',
                title: 'configuration.supplier.statGroup.money',
                icon: 'lucideWallet',
                stats: [
                    { key: 'spent', label: 'configuration.supplier.detailStat.spent', value: s.spent, icon: 'lucideBanknote', format: 'money', note: s.receivedValue !== s.spent ? { key: 'configuration.supplier.detailStat.arrivedWorth', count: s.receivedValue, money: true } : null },
                    { key: 'paid', label: 'configuration.supplier.detailStat.paid', value: s.paid, icon: 'lucideCircleCheck', format: 'money' },
                    { key: 'owed', label: 'configuration.supplier.detailStat.owed', value: s.owed, icon: 'lucideHandCoins', format: 'money', alert: s.owed > 0 },
                    { key: 'orders', label: 'configuration.supplier.detailStat.orders', value: s.orders, icon: 'lucideShoppingCart', format: 'number', note: s.openOrders ? { key: 'configuration.supplier.detailStat.openOrders', count: s.openOrders } : null },
                    { key: 'lead', label: 'configuration.supplier.detailStat.leadDays', value: s.leadDays, icon: 'lucideTruck', format: 'number', unit: 'configuration.supplier.unit.days' },
                    { key: 'onTime', label: 'configuration.supplier.detailStat.onTime', value: s.onTimeRate, icon: 'lucideClock', format: 'number', unit: '%', note: s.promisedOrders ? { key: 'configuration.supplier.detailStat.promised', count: s.promisedOrders } : null },
                ],
            },
            {
                key: 'quality',
                title: 'configuration.supplier.statGroup.quality',
                icon: 'lucideChartColumn',
                stats: [
                    { key: 'short', label: 'configuration.supplier.detailStat.short', value: s.shortRate, icon: 'lucidePackageMinus', format: 'number', unit: '%', note: { key: 'configuration.supplier.detailStat.received', count: s.unitsReceived } },
                    { key: 'faulty', label: 'configuration.supplier.detailStat.faulty', value: s.faultyRate, icon: 'lucideTriangleAlert', format: 'number', unit: '%', note: { key: 'configuration.supplier.detailStat.faultyUnits', count: s.faultyUnits } },
                    { key: 'sold', label: 'configuration.supplier.detailStat.sold', value: s.unitsSold, icon: 'lucideReceipt', format: 'number' },
                    { key: 'sellThrough', label: 'configuration.supplier.detailStat.sellThrough', value: s.sellThrough, icon: 'lucideChartColumn', format: 'number', unit: '%' },
                    { key: 'sales', label: 'configuration.supplier.detailStat.sales', value: s.sales, icon: 'lucideWallet', format: 'money' },
                    { key: 'profit', label: 'configuration.supplier.detailStat.profit', value: s.profit, icon: 'lucideTrendingUp', format: 'money' },
                ],
            },
        ];
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._suppliers.details(this.oid).subscribe({
            next: (details) => {
                this.record.set(details);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    edit(): void {
        void this._router.navigateByUrl(SUPPLIER_ROUTES.edit(this.oid));
    }

    download(kind: SupplierReport): void {
        if (this.downloading()) return;

        this.downloading.set(kind);
        this._suppliers.report(kind, this.oid).subscribe({
            next: (response) => {
                this.downloading.set(null);
                saveDownload(response, `${this.supplier()?.name ?? 'supplier'}-${kind}.xlsx`);
            },
            error: (error: unknown) => {
                this.downloading.set(null);
                const key = failureKey(error, 'configuration.supplier.report.failed');
                this._message.error(this._translate.instant(key));
            },
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(SUPPLIER_ROUTES.list);
    }

    /** Only a row for this very supplier counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<Supplier> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<Supplier> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
