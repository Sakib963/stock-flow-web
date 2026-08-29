import { DatePipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { toObservable, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { WindowState } from '@app/core/config/window-state.config';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { BrandFormComponent } from '@app/modules/configuration/components/brand-form/brand-form.component';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NotFoundComponent } from '@app/shared/components/not-found/not-found.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { SafeTextPipe } from '@app/shared/pipe/safe-text.pipe';
import { TranslateService } from '@ngx-translate/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Subject, combineLatest, startWith, tap, switchMap, map, catchError, EMPTY, finalize } from 'rxjs';

@Component({
    selector: 'view-brand-details',
    imports: [PageHeaderComponent, NgZorroCustomModule, FormsModule, BrandFormComponent, NotFoundComponent, LoaderComponent, DatePipe, SafeTextPipe],
    templateUrl: './view-brand-details.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './view-brand-details.component.scss',
})
export class ViewBrandDetailsComponent {
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

    detailUrl = computed(() => APIEndpoint.GET_BRAND_DETAILS ?? null);
    updateUrl = computed(() => APIEndpoint.UPDATE_BRAND_DETAILS ?? null);
    buttonLoading = signal(false);
  
    private _reload$ = new Subject<void>();

    private _brand$ = combineLatest([this._reload$.pipe(startWith(undefined)), toObservable(this.detailUrl), toObservable(this.itemId)]).pipe(
        tap(() => {
            this.loading.set(true);
        }),
        switchMap(([_, url, id]) =>
            this._configurationService.getDetail$(url!, id).pipe(
                map((response) => {
                    const data = response.body.data;

                    // Set statistics from API response
                    if (data.stats) {
                        this.brandStats.set({
                            totalProducts: data.stats.totalProducts || 0,
                            totalInventoryValue: data.stats.totalInventoryValue || 0,
                            lowStockItems: data.stats.lowStockItems || 0,
                            outOfStockItems: data.stats.outOfStockItems || 0,
                            averageProductPrice: data.stats.averageProductPrice || 0,
                        });
                    } else {
                        // Fallback to null if no stats
                        this.brandStats.set(null);
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
                    const message = error instanceof HttpErrorResponse ? `${error.error?.message || error.message}` : `Brand not found`;
                    this._notificationService.error('Brand Detail', message);
                    return EMPTY;
                }),
                finalize(() => {
                    this.loading.set(false);
                })
            )
        )
    );

    brand = toSignal(this._brand$, { initialValue: null });

    // Data signals - initially null until loaded
    brandStats = signal<any>(null);
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
                    const message = err instanceof HttpErrorResponse ? `Failed to update brand: ${err.error?.message || err.message}` : `Failed to update brand`;
                    this._notificationService.error('Brand Update', message);
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
                        const notificationRef = this._notificationService.warning('Brand Update', response.body?.message || 'Unable To Update Brand');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                        });
                    }
                },
            });
    }

    // Quick Actions
    viewAllProducts(): void {
        // Navigate to products page with brand filter
        this._router.navigate(['/configuration/product'], {
            queryParams: {
                brand: this.itemId(),
                brandName: this.brand()?.name,
            },
        });
    }

    viewLowStockProducts(): void {
        // Navigate to centralized alerts page with brand filter
        this._router.navigate(['/configuration/alerts'], {
            queryParams: {
                type: 'brand',
                id: this.itemId(),
                name: this.brand()?.name,
                alert: 'low-stock',
            },
        });
    }

    viewAnalytics(): void {
        // Navigate to centralized analytics page with brand filter
        this._router.navigate(['/configuration/analytics'], {
            queryParams: {
                type: 'brand',
                id: this.itemId(),
                name: this.brand()?.name,
            },
        });
    }

    generateInventoryReport(): void {
        if (!this.itemId()) {
            this._notificationService.error('Generate Inventory Report', 'Brand ID is missing');
            return;
        }

        const url = APIEndpoint.GENERATE_INVENTORY_REPORT_BY_BRAND;
        const payload = { oid: this.itemId() };
        this.generateReport(url, payload, 'inventory_report');
    }

    exportProductsToExcel(): void {
        if (!this.itemId()) {
            this._notificationService.error('Export Products', 'Brand ID is missing');
            return;
        }

        const url = APIEndpoint.GENERATE_PRODUCT_LIST_REPORT_BY_BRAND;
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
