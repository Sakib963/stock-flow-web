import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBanknote, lucideBoxes, lucideChartColumn, lucideCircleOff, lucideFileSpreadsheet, lucideHistory, lucideInfo, lucidePackage, lucidePencil, lucideRotateCw, lucideTag, lucideTriangleAlert, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { Brand, BrandDetails, BrandReport } from '@app/core/models/brand.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { BRAND_STATUS } from '@app/modules/configuration/brand/config/brand-list.config';
import { PageBack } from '@app/core/models/page-header.model';
import { BRAND_ROUTES } from '@app/modules/configuration/brand/constants/brand-routes';
import { BrandService } from '@app/modules/configuration/brand/services/brand.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { saveDownload } from '@app/shared/utils/download-file/download-file';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';
import { countryName } from '@app/modules/configuration/brand/constants/origin-countries';

/**
 * One brand, read only. The record itself comes first, because it is what someone opened the
 * page to see; the numbers after it are the ones they would otherwise work out by counting.
 */
@Component({
    selector: 'brand-detail',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTimelineModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBanknote, lucideBoxes, lucideChartColumn, lucideCircleOff, lucideFileSpreadsheet, lucideHistory, lucideInfo, lucidePackage, lucidePencil, lucideRotateCw, lucideTag, lucideTriangleAlert, lucideZap })],
    templateUrl: './brand-detail.component.html',
    styleUrl: './brand-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _brands = inject(BrandService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';

    /** The list's row for this brand, when the page was opened from the list. */
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: BRAND_ROUTES.list };
    readonly record = signal<BrandDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    /** What the details card draws: the full record once it is here, the list's row until then. */
    readonly brand = computed<Partial<Brand> | null>(() => this.record()?.details ?? this._seed);

    readonly origin = computed(() => {
        const code = this.brand()?.origin_country;
        return code ? countryName(code, this.language()) : null;
    });

    readonly canEdit = computed(() => this._session.can('configuration.brands.edit'));

    /**
     * Reports are their own permission, not part of view.
     *
     * Opening a brand and taking its whole product catalogue out of the building are different
     * acts, so someone may be able to read this page and not to export it. The server checks the
     * same code on both endpoints; this only decides whether the buttons are there at all.
     */
    readonly canExport = computed(() => this._session.can('configuration.brands.export'));

    /** Which report is downloading, so only that button shows it and neither can be pressed twice. */
    readonly downloading = signal<BrandReport | null>(null);

    readonly reports: readonly { kind: BrandReport; label: string }[] = [
        { kind: 'inventory', label: 'configuration.brand.report.inventory' },
        { kind: 'products', label: 'configuration.brand.report.products' },
    ];

    /** The old page's links into products and analytics. Those pages are not ported yet, so they are here, disabled, with the reason under them. */
    readonly comingActions: readonly { key: string; label: string; icon: string }[] = [
        { key: 'products', label: 'configuration.brand.quick.products', icon: 'lucidePackage' },
        { key: 'lowStock', label: 'configuration.brand.quick.lowStock', icon: 'lucideTriangleAlert' },
        { key: 'analytics', label: 'configuration.brand.quick.analytics', icon: 'lucideChartColumn' },
    ];

    readonly tone = computed(() => {
        const status = this.brand()?.status;
        return status ? resolveTone(BRAND_STATUS, status, undefined, 'the brand status')?.style : null;
    });

    readonly stats = computed(() => {
        const stats = this.record()?.stats;
        if (!stats) return [];
        return [
            { key: 'products', label: 'configuration.brand.detailStat.products', value: stats.totalProducts, icon: 'lucidePackage', format: 'number' as const },
            { key: 'stock', label: 'configuration.brand.detailStat.stock', value: stats.totalAvailableQuantity, icon: 'lucideBoxes', format: 'number' as const },
            { key: 'spent', label: 'configuration.brand.detailStat.spent', value: stats.amountSpent, icon: 'lucideBanknote', format: 'money' as const },
            { key: 'lowStock', label: 'configuration.brand.detailStat.lowStock', value: stats.lowStockItems, icon: 'lucideTriangleAlert', format: 'number' as const },
            { key: 'outOfStock', label: 'configuration.brand.detailStat.outOfStock', value: stats.outOfStockItems, icon: 'lucideCircleOff', format: 'number' as const },
            { key: 'averagePrice', label: 'configuration.brand.detailStat.averagePrice', value: stats.averageProductPrice, icon: 'lucideTag', format: 'money' as const },
        ];
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._brands.details(this.oid).subscribe({
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
        void this._router.navigateByUrl(BRAND_ROUTES.edit(this.oid));
    }

    download(kind: BrandReport): void {
        if (this.downloading()) return;

        this.downloading.set(kind);
        this._brands.report(kind, this.oid).subscribe({
            next: (response) => {
                this.downloading.set(null);
                saveDownload(response, `${this.brand()?.name ?? 'brand'}-${kind}.xlsx`);
            },
            error: (error: unknown) => {
                this.downloading.set(null);
                // A 404 here is an empty brand, not a missing one, and it is the common case on a
                // brand nobody has added products to yet.
                const key = error instanceof HttpErrorResponse && error.status === 404 ? 'configuration.brand.report.empty' : failureKey(error, 'configuration.brand.report.failed');
                this._message.error(this._translate.instant(key));
            },
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(BRAND_ROUTES.list);
    }

    /** Only a row for this very brand counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<Brand> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<Brand> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
