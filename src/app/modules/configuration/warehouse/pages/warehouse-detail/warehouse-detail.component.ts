import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBanknote, lucideBoxes, lucideChartColumn, lucideFileSpreadsheet, lucideGauge, lucideHistory, lucideInfo, lucideMapPinOff, lucidePackage, lucidePencil, lucideRotateCw, lucideTriangleAlert, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { Warehouse, WarehouseDetails, WarehouseReport } from '@app/core/models/warehouse.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { WAREHOUSE_STATUS } from '@app/modules/configuration/warehouse/config/warehouse-list.config';
import { PageBack } from '@app/core/models/page-header.model';
import { WAREHOUSE_ROUTES } from '@app/modules/configuration/warehouse/constants/warehouse-routes';
import { WarehouseService } from '@app/modules/configuration/warehouse/services/warehouse.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { saveDownload } from '@app/shared/utils/download-file/download-file';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

/**
 * One warehouse, read only. The record itself comes first, because it is what someone opened the
 * page to see; the numbers after it are the ones they would otherwise work out by counting.
 */
@Component({
    selector: 'warehouse-detail',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTimelineModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, MoneyPipe, RecordDatePipe, DigitsPipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBanknote, lucideBoxes, lucideChartColumn, lucideFileSpreadsheet, lucideGauge, lucideHistory, lucideInfo, lucideMapPinOff, lucidePackage, lucidePencil, lucideRotateCw, lucideTriangleAlert, lucideZap })],
    templateUrl: './warehouse-detail.component.html',
    styleUrl: './warehouse-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _warehouses = inject(WarehouseService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';

    /** The list's row for this warehouse, when the page was opened from the list. */
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: WAREHOUSE_ROUTES.list };
    readonly record = signal<WarehouseDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    /** What the details card draws: the full record once it is here, the list's row until then. */
    readonly warehouse = computed<Partial<Warehouse> | null>(() => this.record()?.details ?? this._seed);

    readonly canEdit = computed(() => this._session.can('configuration.warehouse.edit'));

    /**
     * Reports are their own permission, not part of view.
     *
     * Opening a warehouse and taking its whole product catalogue out of the building are different
     * acts, so someone may be able to read this page and not to export it. The server checks the
     * same code on both endpoints; this only decides whether the buttons are there at all.
     */
    readonly canExport = computed(() => this._session.can('configuration.warehouse.export'));

    /** Which report is downloading, so only that button shows it and neither can be pressed twice. */
    readonly downloading = signal<WarehouseReport | null>(null);

    readonly reports: readonly { kind: WarehouseReport; label: string }[] = [
        { kind: 'inventory', label: 'configuration.warehouse.report.inventory' },
        { kind: 'products', label: 'configuration.warehouse.report.products' },
    ];

    /** The old page's links into products and analytics. Those pages are not ported yet, so they are here, disabled, with the reason under them. */
    readonly comingActions: readonly { key: string; label: string; icon: string }[] = [
        { key: 'products', label: 'configuration.warehouse.quick.products', icon: 'lucidePackage' },
        { key: 'lowStock', label: 'configuration.warehouse.quick.lowStock', icon: 'lucideTriangleAlert' },
        { key: 'analytics', label: 'configuration.warehouse.quick.analytics', icon: 'lucideChartColumn' },
    ];

    readonly tone = computed(() => {
        const status = this.warehouse()?.status;
        return status ? resolveTone(WAREHOUSE_STATUS, status, undefined, 'the warehouse status')?.style : null;
    });

    readonly stats = computed(() => {
        const stats = this.record()?.stats;
        if (!stats) return [];
        return [
            { key: 'products', label: 'configuration.warehouse.detailStat.products', value: stats.products, icon: 'lucidePackage', format: 'number' as const },
            { key: 'onHand', label: 'configuration.warehouse.detailStat.onHand', value: stats.onHand, icon: 'lucideBoxes', format: 'number' as const, note: { key: 'configuration.warehouse.detailStat.sellable', count: stats.sellable } },
            { key: 'value', label: 'configuration.warehouse.detailStat.value', value: stats.value, icon: 'lucideBanknote', format: 'money' as const },
            { key: 'lowStock', label: 'configuration.warehouse.detailStat.lowStock', value: stats.lowStock, icon: 'lucideTriangleAlert', format: 'number' as const, alert: stats.lowStock > 0 },
            { key: 'unplaced', label: 'configuration.warehouse.detailStat.unplaced', value: stats.unplaced, icon: 'lucideMapPinOff', format: 'number' as const, alert: stats.unplaced > 0 },
            { key: 'full', label: 'configuration.warehouse.detailStat.full', value: stats.fullRate, icon: 'lucideGauge', format: 'number' as const, unit: '%' },
        ];
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._warehouses.details(this.oid).subscribe({
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
        void this._router.navigateByUrl(WAREHOUSE_ROUTES.edit(this.oid));
    }

    download(kind: WarehouseReport): void {
        if (this.downloading()) return;

        this.downloading.set(kind);
        this._warehouses.report(kind, this.oid).subscribe({
            next: (response) => {
                this.downloading.set(null);
                saveDownload(response, `${this.warehouse()?.code ?? 'warehouse'}-${kind}.xlsx`);
            },
            error: (error: unknown) => {
                this.downloading.set(null);
                // A 404 here is an empty warehouse, not a missing one, and it is the common case on a
                // warehouse nothing has been received into yet.
                const key = error instanceof HttpErrorResponse && error.status === 404 ? 'configuration.warehouse.report.empty' : failureKey(error, 'configuration.warehouse.report.failed');
                this._message.error(this._translate.instant(key));
            },
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(WAREHOUSE_ROUTES.list);
    }

    /** Only a row for this very warehouse counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<Warehouse> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<Warehouse> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
