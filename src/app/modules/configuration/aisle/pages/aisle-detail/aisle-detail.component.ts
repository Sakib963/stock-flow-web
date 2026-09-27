import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBanknote, lucideBoxes, lucideChartColumn, lucideClipboardList, lucideFileSpreadsheet, lucideGauge, lucideHistory, lucideInfo, lucidePackage, lucidePencil, lucideRotateCw, lucideTriangleAlert, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { Aisle, AisleDetails, AisleReport } from '@app/core/models/aisle.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { AISLE_STATUS } from '@app/modules/configuration/aisle/config/aisle-list.config';
import { PageBack } from '@app/core/models/page-header.model';
import { WAREHOUSE_ROUTES } from '@app/modules/configuration/warehouse/constants/warehouse-routes';
import { AISLE_ROUTES } from '@app/modules/configuration/aisle/constants/aisle-routes';
import { AisleService } from '@app/modules/configuration/aisle/services/aisle.service';
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
 * One aisle, read only. The record itself comes first, because it is what someone opened the
 * page to see; the numbers after it are the ones they would otherwise work out by counting.
 */
@Component({
    selector: 'aisle-detail',
    imports: [RouterLink, NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTableModule, NzTimelineModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, MoneyPipe, RecordDatePipe, DigitsPipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBanknote, lucideBoxes, lucideChartColumn, lucideClipboardList, lucideFileSpreadsheet, lucideGauge, lucideHistory, lucideInfo, lucidePackage, lucidePencil, lucideRotateCw, lucideTriangleAlert, lucideZap })],
    templateUrl: './aisle-detail.component.html',
    styleUrl: './aisle-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AisleDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _aisles = inject(AisleService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';

    /** The list's row for this aisle, when the page was opened from the list. */
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: AISLE_ROUTES.list };
    readonly record = signal<AisleDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    /** What the details card draws: the full record once it is here, the list's row until then. */
    readonly aisle = computed<Partial<Aisle> | null>(() => this.record()?.details ?? this._seed);

    readonly canViewWarehouse = computed(() => this._session.can('configuration.warehouse.view'));
    readonly warehouseRoute = WAREHOUSE_ROUTES.detail;

    readonly canEdit = computed(() => this._session.can('configuration.aisle.edit'));

    /**
     * Reports are their own permission, not part of view.
     *
     * Opening an aisle and taking its whole product catalogue out of the building are different
     * acts, so someone may be able to read this page and not to export it. The server checks the
     * same code on both endpoints; this only decides whether the buttons are there at all.
     */
    readonly canExport = computed(() => this._session.can('configuration.aisle.export'));

    /** Which report is downloading, so only that button shows it and neither can be pressed twice. */
    readonly downloading = signal<AisleReport | null>(null);

    readonly reports: readonly { kind: AisleReport; label: string }[] = [
        { kind: 'inventory', label: 'configuration.aisle.report.inventory' },
        { kind: 'products', label: 'configuration.aisle.report.products' },
    ];

    /** The old page's links into products and analytics. Those pages are not ported yet, so they are here, disabled, with the reason under them. */
    readonly comingActions: readonly { key: string; label: string; icon: string }[] = [
        { key: 'products', label: 'configuration.aisle.quick.products', icon: 'lucidePackage' },
        { key: 'lowStock', label: 'configuration.aisle.quick.lowStock', icon: 'lucideTriangleAlert' },
        { key: 'analytics', label: 'configuration.aisle.quick.analytics', icon: 'lucideChartColumn' },
    ];

    readonly tone = computed(() => {
        const status = this.aisle()?.status;
        return status ? resolveTone(AISLE_STATUS, status, undefined, 'the aisle status')?.style : null;
    });

    readonly stats = computed(() => {
        const stats = this.record()?.stats;
        if (!stats) return [];
        return [
            { key: 'products', label: 'configuration.aisle.detailStat.products', value: stats.products, icon: 'lucidePackage', format: 'number' as const },
            { key: 'onHand', label: 'configuration.aisle.detailStat.onHand', value: stats.onHand, icon: 'lucideBoxes', format: 'number' as const, note: { key: 'configuration.aisle.detailStat.sellable', count: stats.sellable } },
            { key: 'value', label: 'configuration.aisle.detailStat.value', value: stats.value, icon: 'lucideBanknote', format: 'money' as const },
            { key: 'lowStock', label: 'configuration.aisle.detailStat.lowStock', value: stats.lowStock, icon: 'lucideTriangleAlert', format: 'number' as const, alert: stats.lowStock > 0 },
            { key: 'full', label: 'configuration.aisle.detailStat.full', value: stats.fullRate, icon: 'lucideGauge', format: 'number' as const, unit: '%' },
        ];
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._aisles.details(this.oid).subscribe({
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
        void this._router.navigateByUrl(AISLE_ROUTES.edit(this.oid));
    }

    download(kind: AisleReport): void {
        if (this.downloading()) return;

        this.downloading.set(kind);
        this._aisles.report(kind, this.oid).subscribe({
            next: (response) => {
                this.downloading.set(null);
                saveDownload(response, `${this.aisle()?.code ?? 'aisle'}-${kind}.xlsx`);
            },
            error: (error: unknown) => {
                this.downloading.set(null);
                // A 404 here is an empty aisle, not a missing one, and it is the common case on a
                // aisle nobody has added products to yet.
                const key = error instanceof HttpErrorResponse && error.status === 404 ? 'configuration.aisle.report.empty' : failureKey(error, 'configuration.aisle.report.failed');
                this._message.error(this._translate.instant(key));
            },
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(AISLE_ROUTES.list);
    }

    /** Only a row for this very aisle counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<Aisle> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<Aisle> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
