import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBoxes, lucideChartColumn, lucideHandCoins, lucideHistory, lucideImageOff, lucideInfo, lucideLock, lucidePackageCheck, lucidePencil, lucideRotateCw, lucideShoppingCart, lucideTrash2, lucideTruck, lucideUndo2, lucideZap, lucideCircleX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { PageBack } from '@app/core/models/page-header.model';
import { Product, ProductDetails } from '@app/core/models/product.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { PRODUCT_STATUS } from '@app/modules/configuration/product/config/product-list.config';
import { CATEGORY_ROUTES } from '@app/modules/configuration/category/constants/category-routes';
import { PRODUCT_ROUTES } from '@app/modules/configuration/product/constants/product-routes';
import { SUB_CATEGORY_ROUTES } from '@app/modules/configuration/sub-category/constants/sub-category-routes';
import { ProductService } from '@app/modules/configuration/product/services/product.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { CopyableDirective } from '@app/shared/directives/copyable/copyable.directive';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

/**
 * One product, read only. The record leads, then whether it can be sold right now, then the batches
 * that answer "where is it and what did it cost", then what it has done since it was added.
 */
@Component({
    selector: 'product-detail',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzImageModule, NzSkeletonModule, NzTableModule, NzTimelineModule, NzTooltipModule, RouterLink, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, CopyableDirective, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBoxes, lucideChartColumn, lucideCircleX, lucideHandCoins, lucideHistory, lucideImageOff, lucideInfo, lucideLock, lucidePackageCheck, lucidePencil, lucideRotateCw, lucideShoppingCart, lucideTrash2, lucideTruck, lucideUndo2, lucideZap })],
    templateUrl: './product-detail.component.html',
    styleUrl: './product-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _products = inject(ProductService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';

    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: PRODUCT_ROUTES.list };
    readonly record = signal<ProductDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly deleting = signal(false);

    readonly product = computed<Partial<Product> | null>(() => this.record()?.details ?? this._seed);

    readonly canEdit = computed(() => this._session.can('configuration.product.edit'));
    readonly canDelete = computed(() => this._session.can('configuration.product.delete'));

    /** A link only for someone who may open the page it leads to; plain text otherwise. */
    readonly canViewCategory = computed(() => this._session.can('configuration.category.view'));
    readonly canViewSubCategory = computed(() => this._session.can('configuration.sub-category.view'));
    readonly categoryRoute = CATEGORY_ROUTES.detail;
    readonly subCategoryRoute = SUB_CATEGORY_ROUTES.detail;

    /**
     * Why Delete cannot be used, when the page already knows: the server refuses a product with stock
     * on the shelf or held for online orders, so the button says so before anyone confirms.
     */
    readonly deleteBlockedBy = computed(() => {
        const stock = this.record()?.stock;
        if (!stock) return null;
        if (stock.held > 0) return 'held';
        return stock.on_hand > 0 ? 'in_stock' : null;
    });

    /** One copy large enough for the zoomed preview, which nz-image draws from the same source as the card. */
    readonly photoCard = computed(() => this.product()?.photo?.replace('/image/upload/', '/image/upload/c_limit,w_1200,h_1200,f_auto,q_auto/') ?? null);

    readonly tone = computed(() => {
        const status = this.product()?.status;
        return status ? resolveTone(PRODUCT_STATUS, status, undefined, 'the product status')?.style : null;
    });

    readonly stats = computed(() => {
        const loaded = this.record();
        if (!loaded) return [];
        const { stock, lifetime } = loaded;
        return [
            { key: 'sellable', label: 'configuration.product.detailStat.sellable', value: stock.sellable, icon: 'lucidePackageCheck' },
            { key: 'onHand', label: 'configuration.product.detailStat.onHand', value: stock.on_hand, icon: 'lucideBoxes' },
            { key: 'held', label: 'configuration.product.detailStat.held', value: stock.held, icon: 'lucideLock' },
            { key: 'sold', label: 'configuration.product.detailStat.sold', value: lifetime.sold, icon: 'lucideHandCoins' },
            { key: 'returned', label: 'configuration.product.detailStat.returned', value: lifetime.returned, icon: 'lucideUndo2' },
            { key: 'damaged', label: 'configuration.product.detailStat.damaged', value: lifetime.damaged, icon: 'lucideCircleX' },
        ];
    });

    /** Where the stock number stands against the restock level, the same three states the list shows. */
    readonly stockState = computed(() => {
        const loaded = this.record();
        if (!loaded) return null;
        if (loaded.stock.sellable <= 0) return 'out';
        return loaded.stock.sellable <= loaded.details.restock_threshold ? 'low' : null;
    });

    /** The pages these link to are not ported yet, so they are here, disabled, with the reason under them. */
    readonly comingActions: readonly { key: string; label: string; icon: string }[] = [
        { key: 'receive', label: 'configuration.product.quick.receive', icon: 'lucideTruck' },
        { key: 'sales', label: 'configuration.product.quick.sales', icon: 'lucideShoppingCart' },
        { key: 'analytics', label: 'configuration.product.quick.analytics', icon: 'lucideChartColumn' },
    ];

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._products.details(this.oid).subscribe({
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
        void this._router.navigateByUrl(PRODUCT_ROUTES.edit(this.oid));
    }

    remove(): void {
        if (this.deleting() || this.deleteBlockedBy()) return;
        const name = this.product()?.name ?? '';
        confirmAction(this._modal, {
            title: this._translate.instant('configuration.product.confirmDelete.title'),
            body: this._translate.instant('configuration.product.confirmDelete.body', { name }),
            ok: this._translate.instant('configuration.product.delete'),
            cancel: this._translate.instant('form.confirm.cancel'),
            danger: true,
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            this.deleting.set(true);
            this._products.remove(this.oid).subscribe({
                next: () => {
                    this.deleting.set(false);
                    this._message.success(this._translate.instant('configuration.product.deleted', { name }));
                    void this._router.navigateByUrl(PRODUCT_ROUTES.list);
                },
                error: (error: unknown) => {
                    this.deleting.set(false);
                    const blocked = this._products.deleteBlockOf(error);
                    const key = blocked ? `configuration.product.deleteBlocked.${blocked.reason}` : failureKey(error, 'configuration.product.deleteFailed');
                    this._message.error(localDigits(this._translate.instant(key, { count: blocked?.count }), this.language()));
                },
            });
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(PRODUCT_ROUTES.list);
    }

    private seedFromList(): Partial<Product> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<Product> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
