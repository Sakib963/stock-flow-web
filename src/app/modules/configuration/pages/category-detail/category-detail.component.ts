import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBanknote, lucideBoxes, lucidePackage, lucidePencil, lucideTriangleAlert } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { CategoryDetails } from '@app/core/models/category.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { CATEGORY_STATUS } from '@app/modules/configuration/config/category-list/category-list.config';
import { PageBack } from '@app/core/models/page-header.model';
import { CATEGORY_ROUTES } from '@app/modules/configuration/constants/category-routes';
import { CategoryService } from '@app/modules/configuration/services/category.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

/**
 * One category, read only. The numbers at the top are the ones someone would otherwise work out by
 * opening the product list and counting, which is the whole reason this page exists rather than a
 * dialog showing the four fields back.
 */
@Component({
    selector: 'category-detail',
    imports: [NgIcon, NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideBanknote, lucideBoxes, lucidePackage, lucidePencil, lucideTriangleAlert })],
    templateUrl: './category-detail.component.html',
    styleUrl: './category-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _categories = inject(CategoryService);
    private readonly _session = inject(SessionService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';

    readonly back: PageBack = { route: CATEGORY_ROUTES.list };
    readonly record = signal<CategoryDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    readonly canEdit = computed(() => this._session.can('configuration.category.edit'));

    readonly tone = computed(() => {
        const status = this.record()?.details.status;
        return status ? resolveTone(CATEGORY_STATUS, status, undefined, 'the category status')?.style : null;
    });

    readonly stats = computed(() => {
        const stats = this.record()?.stats;
        if (!stats) return [];
        return [
            { key: 'products', label: 'configuration.category.detailStat.products', value: stats.totalProducts, icon: 'lucidePackage', format: 'number' as const },
            { key: 'stock', label: 'configuration.category.detailStat.stock', value: stats.totalAvailableQuantity, icon: 'lucideBoxes', format: 'number' as const },
            { key: 'spent', label: 'configuration.category.detailStat.spent', value: stats.amountSpent, icon: 'lucideBanknote', format: 'money' as const },
            { key: 'lowStock', label: 'configuration.category.detailStat.lowStock', value: stats.lowStockItems, icon: 'lucideTriangleAlert', format: 'number' as const },
        ];
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._categories.details(this.oid).subscribe({
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
        void this._router.navigateByUrl(CATEGORY_ROUTES.edit(this.oid));
    }

    backToList(): void {
        void this._router.navigateByUrl(CATEGORY_ROUTES.list);
    }
}
