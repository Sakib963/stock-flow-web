import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideArrowLeftRight, lucideBadgeDollarSign, lucideBoxes, lucideCalendarClock, lucideEllipsis, lucideFileSpreadsheet, lucideHistory, lucideInfo, lucideLock, lucidePackageCheck, lucidePercent, lucidePrinter, lucideRotateCw, lucideShoppingCart, lucideTag, lucideTrendingDown, lucideTrendingUp, lucideWallet, lucideBanknote, lucideWrench, lucideZap, lucideSlidersHorizontal, lucideTrash2 } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { FormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { PageBack } from '@app/core/models/page-header.model';
import { StockMovementRow } from '@app/core/models/stock-movement.model';
import { ProductStock, StockBatch, StockProduct } from '@app/core/models/stock-overview.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { PRODUCT_ROUTES } from '@app/modules/configuration/product/constants/product-routes';
import { PURCHASE_ORDER_ROUTES } from '@app/modules/inventory/purchase-order/constants/purchase-order-routes';
import { STOCK_MOVEMENT_REASON } from '@app/modules/inventory/stock-movement/config/stock-movement-list.config';
import { STOCK_MOVEMENT_ROUTES } from '@app/modules/inventory/stock-movement/constants/stock-movement-routes';
import { BatchBudgetDialogComponent } from '@app/modules/inventory/stock-overview/components/batch-budget-dialog/batch-budget-dialog.component';
import { BatchPriceDialogComponent } from '@app/modules/inventory/stock-overview/components/batch-price-dialog/batch-price-dialog.component';
import { StickerDialogComponent } from '@app/modules/inventory/stock-overview/components/sticker-dialog/sticker-dialog.component';
import { STOCK_STATUS, STOCK_VALUE } from '@app/modules/inventory/stock-overview/config/stock-overview-list.config';
import { STOCK_OVERVIEW_ROUTES } from '@app/modules/inventory/stock-overview/constants/stock-overview-routes';
import { StockOverviewService } from '@app/modules/inventory/stock-overview/services/stock-overview.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { BatchExpiryComponent } from '@app/shared/components/batch-expiry/batch-expiry.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { CopyableDirective } from '@app/shared/directives/copyable/copyable.directive';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { saveDownload } from '@app/shared/utils/download-file/download-file';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

interface Figure {
    key: string;
    label: string;
    icon: string;
    value: number;
    money?: boolean;
    percent?: boolean;
}

/**
 * One product's stock: its batches, each with its price, budget, expiry and stickers. Cost and profit
 * appear only for someone the server sent them to; the page never guesses.
 */
@Component({
    selector: 'product-stock',
    imports: [FormsModule, NgIcon, NzButtonModule, NzCardModule, NzDropdownModule, NzMenuModule, NzSkeletonModule, NzSwitchModule, NzTableModule, NzTimelineModule, NzTooltipModule, RouterLink, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, BatchExpiryComponent, BatchPriceDialogComponent, BatchBudgetDialogComponent, StickerDialogComponent, CopyableDirective, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideArrowLeftRight, lucideBadgeDollarSign, lucideBanknote, lucideBoxes, lucideCalendarClock, lucideEllipsis, lucideFileSpreadsheet, lucideHistory, lucideInfo, lucideLock, lucidePackageCheck, lucidePercent, lucidePrinter, lucideRotateCw, lucideShoppingCart, lucideSlidersHorizontal, lucideTag, lucideTrash2, lucideTrendingDown, lucideTrendingUp, lucideWallet, lucideWrench, lucideZap })],
    templateUrl: './product-stock.component.html',
    styleUrl: './product-stock.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductStockComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _stock = inject(StockOverviewService);
    private readonly _session = inject(SessionService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: STOCK_OVERVIEW_ROUTES.list };
    readonly record = signal<ProductStock | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    readonly product = computed<Partial<StockProduct> | null>(() => this.record()?.product ?? this._seed);
    readonly seesMoney = computed(() => this.record()?.sees_money ?? this._session.can(STOCK_VALUE));
    readonly canEdit = computed(() => this._session.can('inventory.overview.edit'));
    readonly canEditExpiry = computed(() => this.canEdit() || this._session.can('inventory.purchase-order.edit'));
    readonly canViewCatalogue = computed(() => this._session.can('configuration.product.view'));
    readonly canViewOrders = computed(() => this._session.can('inventory.purchase-order.view'));
    readonly catalogueRoute = PRODUCT_ROUTES.detail;
    readonly purchaseRoute = PURCHASE_ORDER_ROUTES.detail;
    readonly purchaseCreateRoute = PURCHASE_ORDER_ROUTES.create;
    readonly canExport = computed(() => this._session.can('inventory.overview.export'));
    readonly downloading = signal(false);
    readonly canOrder = computed(() => this._session.can('inventory.purchase-order.create'));
    readonly comingActions = [
        { key: 'adjust', label: 'inventory.stockOverview.quick.adjust', icon: 'lucideSlidersHorizontal' },
        { key: 'dispose', label: 'inventory.stockOverview.quick.dispose', icon: 'lucideTrash2' },
    ];

    readonly showSoldOut = signal(false);
    readonly batches = computed(() => (this.record()?.batches ?? []).filter((batch) => this.showSoldOut() || batch.on_hand > 0 || batch.held > 0));
    readonly soldOut = computed(() => (this.record()?.batches ?? []).filter((batch) => batch.on_hand === 0 && batch.held === 0).length);

    /** The batch whose menu is open: it opens on hover, and on a click for touch and keyboard. */
    readonly menuOpen = signal<string | null>(null);
    readonly pricing = signal<StockBatch | null>(null);
    readonly budgeting = signal<StockBatch | null>(null);
    readonly labelling = signal<StockBatch | null>(null);

    readonly canViewMovements = computed(() => this._session.can('inventory.stock-movement.view'));
    readonly movements = signal<StockMovementRow[] | null>(null);
    readonly movementsFailed = signal<RequestFailure | null>(null);
    readonly movementListRoute = STOCK_MOVEMENT_ROUTES.list;

    /** Sellable against the restock level, the same three states the list shows. */
    readonly stockState = computed(() => {
        const loaded = this.record();
        if (!loaded) return null;
        const { sellable } = loaded.figures;
        return sellable <= 0 ? 'out' : sellable <= loaded.product.restock_threshold ? 'low' : 'in';
    });

    readonly figures = computed<Figure[]>(() => {
        const loaded = this.record();
        if (!loaded) return [];
        const f = loaded.figures;
        const quantities: Figure[] = [
            { key: 'sellable', label: 'inventory.stockOverview.sellable', icon: 'lucidePackageCheck', value: f.sellable },
            { key: 'on_hand', label: 'inventory.stockOverview.onHand', icon: 'lucideBoxes', value: f.on_hand },
            { key: 'held', label: 'inventory.stockOverview.held', icon: 'lucideLock', value: f.held },
            { key: 'expiring', label: 'inventory.stockOverview.stat.expiring', icon: 'lucideCalendarClock', value: f.expiring_units + f.expired_units },
        ];
        if (f.stock_value === undefined) return quantities;
        const revenue = Number(f.expected_revenue ?? 0);
        return [
            ...quantities,
            { key: 'stock_value', label: 'inventory.stockOverview.stockValue', icon: 'lucideWallet', value: Number(f.stock_value), money: true },
            { key: 'revenue', label: 'inventory.stockOverview.revenue', icon: 'lucideBanknote', value: revenue, money: true },
            { key: 'profit_full', label: 'inventory.stockOverview.profitFull', icon: 'lucideTrendingUp', value: Number(f.profit_full ?? 0), money: true },
            { key: 'profit_discounted', label: 'inventory.stockOverview.profitDiscounted', icon: 'lucideTrendingDown', value: Number(f.profit_discounted ?? 0), money: true },
            { key: 'margin', label: 'inventory.stockOverview.margin', icon: 'lucidePercent', value: revenue ? Math.round((Number(f.profit_full ?? 0) / revenue) * 100) : 0, percent: true },
            { key: 'internal_value', label: 'inventory.stockOverview.internalValue', icon: 'lucideWrench', value: Number(f.internal_value ?? 0), money: true },
        ];
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._stock.productStock(this.oid).subscribe({
            next: (stock) => {
                this.record.set(stock);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.failed.set(failureOf(error));
                this.loading.set(false);
            },
        });
        this.loadMovements();
    }

    loadMovements(): void {
        if (!this.canViewMovements()) return;
        this.movements.set(null);
        this.movementsFailed.set(null);
        this._stock.movements(this.oid).subscribe({
            next: (rows) => this.movements.set(rows),
            error: (error: unknown) => this.movementsFailed.set(failureOf(error)),
        });
    }

    statusOf(state: string) {
        return resolveTone(STOCK_STATUS, state, undefined, 'a stock status')?.style ?? null;
    }

    reasonOf(reason: string) {
        return resolveTone(STOCK_MOVEMENT_REASON, reason, undefined, 'a stock movement reason')?.style ?? null;
    }

    /** A batch for sale takes a price; internal use stock never does. */
    canPrice(batch: StockBatch): boolean {
        return this.canEdit() && batch.intended_use === 'for_sale';
    }

    /** Budgets are money, and live on the purchase line the batch came from. */
    canBudget(batch: StockBatch): boolean {
        return this.canEdit() && this.seesMoney() && !!batch.purchase_oid;
    }

    changed(): void {
        this.pricing.set(null);
        this.budgeting.set(null);
        this.load();
    }

    download(): void {
        if (this.downloading()) return;
        this.downloading.set(true);
        this._stock.report(this.oid).subscribe({
            next: (response) => {
                this.downloading.set(false);
                saveDownload(response, `${this.product()?.sku ?? 'product'}-stock.xlsx`);
            },
            error: (error: unknown) => {
                this.downloading.set(false);
                this._message.error(this._translate.instant(failureKey(error, 'inventory.stockOverview.quick.reportFailed')));
            },
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(STOCK_OVERVIEW_ROUTES.list);
    }

    private seedFromList(): Partial<StockProduct> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<StockProduct> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
