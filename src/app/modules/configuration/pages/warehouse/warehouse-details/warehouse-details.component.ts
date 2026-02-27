import { DatePipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { toObservable, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WindowState } from '@app/core/config/window-state.config';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { WarehouseFormComponent } from '@app/modules/configuration/components/warehouse-form/warehouse-form.component';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NotFoundComponent } from '@app/shared/components/not-found/not-found.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { TranslateService } from '@ngx-translate/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Subject, combineLatest, startWith, tap, switchMap, map, catchError, EMPTY, finalize } from 'rxjs';

@Component({
    selector: 'warehouse-details',
    imports: [PageHeaderComponent, NgZorroCustomModule, FormsModule, WarehouseFormComponent, NotFoundComponent, LoaderComponent, DatePipe],
    templateUrl: './warehouse-details.component.html',
    styleUrl: './warehouse-details.component.scss',
})
export class WarehouseDetailsComponent {
    itemId = input.required<string>({ alias: 'oid' });

    loading = signal<boolean>(false);
    loadingReportKey = signal<string | null>(null);

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
    private readonly _translateService = inject(TranslateService);

    detailUrl = computed(() => APIEndpoint.GET_WAREHOUSE_DETAILS ?? null);
    updateUrl = computed(() => APIEndpoint.UPDATE_WAREHOUSE_DETAILS ?? null);
    buttonLoading = signal(false);

    private _reload$ = new Subject<void>();

    private _warehouse$ = combineLatest([this._reload$.pipe(startWith(undefined)), toObservable(this.detailUrl), toObservable(this.itemId)]).pipe(
        tap(() => {
            this.loading.set(true);
        }),
        switchMap(([_, url, id]) =>
            this._configurationService.getDetail$(url!, id).pipe(
                map((response) => {
                    const data = response.body.data;

                    // Set statistics from API response
                    if (data.stats) {
                        this.warehouseStats.set({
                            totalProducts: data.stats.totalProducts || 0,
                            totalAisles: data.stats.totalAisles || 0,
                            totalInventoryValue: data.stats.totalInventoryValue || 0,
                            totalQuantity: data.stats.totalQuantity || 0,
                            utilizationPercentage: data.stats.utilizationPercentage || 0,
                        });
                    } else {
                        // Fallback to null if no stats
                        this.warehouseStats.set(null);
                    }

                    // Set activity timeline from API response
                    if (data.activity && data.activity.length > 0) {
                        this.activityTimeline.set(data.activity);
                    } else {
                        // Empty array if no activity
                        this.activityTimeline.set([]);
                    }

                    // Return only the details part
                    return data.details;
                }),
                catchError((error: HttpErrorResponse | Error) => {
                    this.loading.set(false);
                    const message = error instanceof HttpErrorResponse ? `${error.error?.message || error.message}` : `Warehouse not found`;
                    this._notificationService.error('Warehouse Detail', message);
                    return EMPTY;
                }),
                finalize(() => {
                    this.loading.set(false);
                })
            )
        )
    );

    warehouse = toSignal(this._warehouse$, { initialValue: null });

    // Data signals - initially null until loaded
    warehouseStats = signal<any>(null);
    activityTimeline = signal<any[]>([]);

    async ngOnInit() {
        this.state.set(window.history.state as WindowState);
        this.editMode = typeof window !== 'undefined' && window.history.state?.edit === true;
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
                    const message = err instanceof HttpErrorResponse ? `Failed to update warehouse: ${err.error?.message || err.message}` : `Failed to update warehouse`;
                    this._notificationService.error('Warehouse Update', message);
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
                        const notificationRef = this._notificationService.warning('Warehouse Update', response.body?.message || 'Unable To Update Warehouse');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                        });
                    }
                },
            });
    }

    // Quick Actions
    viewAllProducts(): void {
        // Navigate to products page with warehouse filter
        this._router.navigate(['/configuration/product'], {
            queryParams: {
                warehouse: this.itemId(),
                warehouseName: this.warehouse()?.name,
            },
        });
    }

    viewAnalytics(): void {
        // Navigate to centralized analytics page with warehouse filter
        this._router.navigate(['/configuration/analytics'], {
            queryParams: {
                type: 'warehouse',
                id: this.itemId(),
                name: this.warehouse()?.name,
            },
        });
    }

    generateInventoryReport(): void {
        if (!this.itemId()) {
            this._notificationService.error('Generate Inventory Report', 'Warehouse ID is missing');
            return;
        }

        const url = APIEndpoint.GENERATE_INVENTORY_REPORT_BY_WAREHOUSE;
        const payload = { oid: this.itemId() };
        this.generateReport(url, payload, 'inventory_report');
    }

    exportProductsToExcel(): void {
        if (!this.itemId()) {
            this._notificationService.error('Export Products', 'Warehouse ID is missing');
            return;
        }

        const url = APIEndpoint.GENERATE_PRODUCT_LIST_REPORT_BY_WAREHOUSE;
        const payload = { oid: this.itemId() };
        this.generateReport(url, payload, 'product_export');
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
                        this._notificationService.info(this._translateService.instant('common.notification.title.info'), this._translateService.instant('common.notification.no_data_found'));
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
                        this._notificationService.warning(this._translateService.instant('common.notification.title.warning'), this._translateService.instant('common.notification.no_content_found_for_report'));
                        return;
                    }
                    this._notificationService.error(this._translateService.instant('common.notification.title.error'), this._translateService.instant('common.notification.something_went_wrong'));
                },
            });
    }
}
