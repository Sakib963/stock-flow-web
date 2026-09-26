import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBanknote, lucideBoxes, lucideChartColumn, lucideCircleOff, lucideFileSpreadsheet, lucideHistory, lucideInfo, lucidePackage, lucidePencil, lucideRotateCw, lucideTag, lucideTriangleAlert, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { SubCategory, SubCategoryDetails, SubCategoryReport } from '@app/core/models/sub-category.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { SUB_CATEGORY_STATUS } from '@app/modules/configuration/sub-category/config/sub-category-list.config';
import { PageBack } from '@app/core/models/page-header.model';
import { CATEGORY_ROUTES } from '@app/modules/configuration/category/constants/category-routes';
import { SUB_CATEGORY_ROUTES } from '@app/modules/configuration/sub-category/constants/sub-category-routes';
import { SubCategoryService } from '@app/modules/configuration/sub-category/services/sub-category.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { saveDownload } from '@app/shared/utils/download-file/download-file';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

/**
 * One sub-category, read only. The record itself comes first, because it is what someone opened the
 * page to see; the numbers after it are the ones they would otherwise work out by counting.
 */
@Component({
    selector: 'sub-category-detail',
    imports: [RouterLink, NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTimelineModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBanknote, lucideBoxes, lucideChartColumn, lucideCircleOff, lucideFileSpreadsheet, lucideHistory, lucideInfo, lucidePackage, lucidePencil, lucideRotateCw, lucideTag, lucideTriangleAlert, lucideZap })],
    templateUrl: './sub-category-detail.component.html',
    styleUrl: './sub-category-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubCategoryDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _subCategories = inject(SubCategoryService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';

    /** The list's row for this sub-category, when the page was opened from the list. */
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: SUB_CATEGORY_ROUTES.list };
    readonly record = signal<SubCategoryDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    /** What the details card draws: the full record once it is here, the list's row until then. */
    readonly subCategory = computed<Partial<SubCategory> | null>(() => this.record()?.details ?? this._seed);

    readonly canViewCategory = computed(() => this._session.can('configuration.category.view'));
    readonly categoryRoute = CATEGORY_ROUTES.detail;

    readonly canEdit = computed(() => this._session.can('configuration.sub-category.edit'));

    /**
     * Reports are their own permission, not part of view.
     *
     * Opening a sub-category and taking its whole product catalogue out of the building are different
     * acts, so someone may be able to read this page and not to export it. The server checks the
     * same code on both endpoints; this only decides whether the buttons are there at all.
     */
    readonly canExport = computed(() => this._session.can('configuration.sub-category.export'));

    /** Which report is downloading, so only that button shows it and neither can be pressed twice. */
    readonly downloading = signal<SubCategoryReport | null>(null);

    readonly reports: readonly { kind: SubCategoryReport; label: string }[] = [
        { kind: 'inventory', label: 'configuration.subCategory.report.inventory' },
        { kind: 'products', label: 'configuration.subCategory.report.products' },
    ];

    /** The old page's links into products and analytics. Those pages are not ported yet, so they are here, disabled, with the reason under them. */
    readonly comingActions: readonly { key: string; label: string; icon: string }[] = [
        { key: 'products', label: 'configuration.subCategory.quick.products', icon: 'lucidePackage' },
        { key: 'lowStock', label: 'configuration.subCategory.quick.lowStock', icon: 'lucideTriangleAlert' },
        { key: 'analytics', label: 'configuration.subCategory.quick.analytics', icon: 'lucideChartColumn' },
    ];

    readonly tone = computed(() => {
        const status = this.subCategory()?.status;
        return status ? resolveTone(SUB_CATEGORY_STATUS, status, undefined, 'the sub-category status')?.style : null;
    });

    readonly stats = computed(() => {
        const stats = this.record()?.stats;
        if (!stats) return [];
        return [
            { key: 'products', label: 'configuration.subCategory.detailStat.products', value: stats.totalProducts, icon: 'lucidePackage', format: 'number' as const },
            { key: 'stock', label: 'configuration.subCategory.detailStat.stock', value: stats.totalAvailableQuantity, icon: 'lucideBoxes', format: 'number' as const },
            { key: 'spent', label: 'configuration.subCategory.detailStat.spent', value: stats.amountSpent, icon: 'lucideBanknote', format: 'money' as const },
            { key: 'lowStock', label: 'configuration.subCategory.detailStat.lowStock', value: stats.lowStockItems, icon: 'lucideTriangleAlert', format: 'number' as const },
            { key: 'outOfStock', label: 'configuration.subCategory.detailStat.outOfStock', value: stats.outOfStockItems, icon: 'lucideCircleOff', format: 'number' as const },
            { key: 'averagePrice', label: 'configuration.subCategory.detailStat.averagePrice', value: stats.averageProductPrice, icon: 'lucideTag', format: 'money' as const },
        ];
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._subCategories.details(this.oid).subscribe({
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
        void this._router.navigateByUrl(SUB_CATEGORY_ROUTES.edit(this.oid));
    }

    download(kind: SubCategoryReport): void {
        if (this.downloading()) return;

        this.downloading.set(kind);
        this._subCategories.report(kind, this.oid).subscribe({
            next: (response) => {
                this.downloading.set(null);
                saveDownload(response, `${this.subCategory()?.category_code ?? 'sub-category'}-${kind}.xlsx`);
            },
            error: (error: unknown) => {
                this.downloading.set(null);
                // A 404 here is an empty sub-category, not a missing one, and it is the common case on a
                // sub-category nobody has added products to yet.
                const key = error instanceof HttpErrorResponse && error.status === 404 ? 'configuration.subCategory.report.empty' : failureKey(error, 'configuration.subCategory.report.failed');
                this._message.error(this._translate.instant(key));
            },
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(SUB_CATEGORY_ROUTES.list);
    }

    /** Only a row for this very sub-category counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<SubCategory> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<SubCategory> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
