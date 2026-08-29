import { DatePipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { toObservable, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WindowState } from '@app/core/config/window-state.config';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { FormActions } from '@app/core/interfaces/form-action';
import { ImagePreviewService } from '@app/core/services/image-preview.service';
import { ProductFormComponent } from '@app/modules/configuration/components/product-form/product-form.component';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NotFoundComponent } from '@app/shared/components/not-found/not-found.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { SafeTextPipe } from '@app/shared/pipe/safe-text.pipe';
import { CurrencyFormatPipe } from '@app/shared/pipe/currency-format.pipe';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Subject, combineLatest, startWith, tap, switchMap, map, catchError, EMPTY, finalize } from 'rxjs';

@Component({
    selector: 'view-product-details',
    imports: [PageHeaderComponent, NgZorroCustomModule, FormsModule, ProductFormComponent, DatePipe, SafeTextPipe, CurrencyFormatPipe, LoaderComponent, NotFoundComponent],
    templateUrl: './view-product-details.component.html',
    styleUrl: './view-product-details.component.scss',
})
export class ViewProductDetailsComponent {
    itemId = input.required<string>({ alias: 'oid' });

    loading = signal<boolean>(false);

    editMode = false;
    state = signal<WindowState | null>(null);
    action = computed(() => this.state()?.action || 'view');
    editable = computed(() => this.action() === 'view');

    private readonly _location = inject(Location);
    private readonly _router = inject(Router);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _activatedRoute = inject(ActivatedRoute);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _configurationService = inject(ConfigurationService);
    private readonly _httpService = inject(HttpService);
    private readonly _imagePreviewService = inject(ImagePreviewService);

    detailUrl = computed(() => APIEndpoint.GET_PRODUCT_DETAILS ?? null);
    updateUrl = computed(() => APIEndpoint.UPDATE_PRODUCT_DETAILS ?? null);
    buttonLoading = signal(false);
    loadingReportKey = signal<string | null>(null);

    private _reload$ = new Subject<void>();

    private _product$ = combineLatest([this._reload$.pipe(startWith(undefined)), toObservable(this.detailUrl), toObservable(this.itemId)]).pipe(
        tap(() => {
            this.loading.set(true);
        }),
        switchMap(([_, url, id]) =>
            this._configurationService.getDetail$(url!, id).pipe(
                map((response) => {
                    const data = response.body.data;

                    // Set statistics from API response
                    if (data.stats) {
                        this.productStats.set({
                            totalSold: data.stats.total_sold || 0,
                            totalReturned: data.stats.total_returned || 0,
                            totalDamaged: data.stats.total_damaged || 0,
                            totalWasted: data.stats.total_wasted || 0,
                        });
                    } else {
                        this.productStats.set(null);
                    }

                    // Set inventory summary from API response
                    if (data.inventory) {
                        this.inventorySummary.set({
                            totalQuantity: data.inventory.total_quantity || 0,
                            availableQuantity: data.inventory.available_quantity || 0,
                            totalValue: data.inventory.total_value || 0,
                            warehouseCount: data.inventory.warehouse_count || 0,
                            avgCostPrice: data.inventory.avg_cost_price || 0,
                            avgSellingPrice: data.inventory.avg_selling_price || 0,
                            batchCount: data.inventory.batch_count || 0,
                        });
                    } else {
                        this.inventorySummary.set(null);
                    }

                    // Set activity timeline from API response
                    if (data.activity && data.activity.length > 0) {
                        this.activityTimeline.set(data.activity);
                    } else {
                        this.activityTimeline.set([]);
                    }

                    // Return only the details part
                    return data.details;
                }),
                catchError((error: HttpErrorResponse | Error) => {
                    this.loading.set(false);
                    const message = error instanceof HttpErrorResponse ? `${error.error?.message || error.message}` : `Product not found`;
                    this._notificationService.error('Product Detail', message);
                    return EMPTY;
                }),
                finalize(() => {
                    this.loading.set(false);
                })
            )
        )
    );

    product = toSignal(this._product$, { initialValue: null });

    // Data signals - initially null until loaded
    productStats = signal<any>(null);
    inventorySummary = signal<any>(null);
    activityTimeline = signal<any[]>([]);

    // Open pre-order demand for this product: the reorder signal. Customers have
    // already committed to these units, so this is real demand rather than a
    // forecast. Bookings are not sales, so this never touches revenue figures.
    preOrderDemand = signal<any>(null);

    async ngOnInit() {
        this.state.set(window.history.state as WindowState);
        this.editMode = typeof window !== 'undefined' && window.history.state?.edit === true;
        this.loadPreOrderDemand();
    }

    loadPreOrderDemand(): void {
        this._httpService
            .get(APIEndpoint.GET_PRE_ORDERS_BY_PRODUCT, { product_oid: this.itemId() })
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this.preOrderDemand.set(res.body.data);
                    }
                },
                error: () => {
                    // Non-fatal: the product page is still useful without it.
                    this.preOrderDemand.set(null);
                },
            });
    }

    viewPreOrders(): void {
        this._router.navigate(['/sales/pre-order/list']);
    }

    handleSwitchChange(event: boolean): void {
        this.editMode = event;
    }

    onRefresh(): void {
        this._reload$.next();
    }

    navigateBack(): void {
        this._location.back();
    }

    onFormActions($event: FormActions): void {
        if ($event.action === 'cancel') {
            this.editMode = false;
        }
        if ($event.action !== 'update') {
            return;
        }
        this.buttonLoading.set(true);
        this._configurationService
            .updateItem$(this.updateUrl(), $event.data)
            .pipe(
                catchError((err) => {
                    const message = err instanceof HttpErrorResponse ? `Failed to update product: ${err.error?.message || err.message}` : `Failed to update product`;
                    this._notificationService.error('Product Update', message);
                    return EMPTY;
                }),
                finalize(() => {
                    this.buttonLoading.set(false);
                })
            )
            .subscribe({
                next: (response) => {
                    if (response.status === 200) {
                        this._reload$.next();
                        this.editMode = false;
                    } else {
                        const notificationRef = this._notificationService.warning('Product Update', response.body?.message || 'Unable To Update Product');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                        });
                    }
                },
            });
    }

    viewInventory(): void {
        // Navigate to inventory page filtered by this product
        this._router.navigate(['/inventory/overview/list'], {
            queryParams: {
                productId: this.itemId(),
                productName: this.product()?.name,
            },
        });
    }

    viewPurchaseHistory(): void {
        // Navigate to purchase history filtered by this product
        this._router.navigate(['/inventory/purchase-order'], {
            queryParams: {
                productId: this.itemId(),
                productName: this.product()?.name,
            },
        });
    }

    viewSalesHistory(): void {
        // Navigate to the orders list filtered by this product
        this._router.navigate(['/sales/orders/list'], {
            queryParams: {
                productId: this.itemId(),
                productName: this.product()?.name,
            },
        });
    }

    generateInventoryReport(): void {
        if (!this.itemId()) {
            this._notificationService.error('Generate Inventory Report', 'Product ID is missing');
            return;
        }

        const url = APIEndpoint.GENERATE_PRODUCT_INVENTORY_REPORT;
        const payload = { oid: this.itemId() };
        this.generateReport(url, payload, 'inventory_report');
    }

    generateMovementReport(): void {
        if (!this.itemId()) {
            this._notificationService.error('Generate Movement Report', 'Product ID is missing');
            return;
        }

        const url = APIEndpoint.GENERATE_PRODUCT_MOVEMENT_REPORT;
        const payload = { oid: this.itemId() };
        this.generateReport(url, payload, 'movement_report');
    }

    generateReport(path: any, payload: any, report_key: string): void {
        this.loadingReportKey.set(report_key);
        this._configurationService
            .downloadReport$(path, payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => this.loadingReportKey.set(null))
            )
            .subscribe({
                next: (res: any) => {
                    const blob: Blob = res.body;
                    if (!blob) {
                        this._notificationService.info('Report Generation', 'No data found for the report');
                        return;
                    }

                    const fileName = res.headers.get('X-Filename') || `${report_key}_${Date.now()}.xlsx`;

                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    window.URL.revokeObjectURL(url);
                },
                error: (err: any) => {
                    if (err.status === 404) {
                        this._notificationService.warning('Report Generation', 'No content found for report');
                        return;
                    }
                    this._notificationService.error('Report Generation', 'Something went wrong while generating report');
                },
            });
    }

    previewProductPhoto(imageUrl: string): void {
        const product = this.product();
        const title = product?.name ? `${product.name} - Product Photo` : 'Product Photo';
        this._imagePreviewService.previewImage(imageUrl, title);
    }
}
