import { CommonModule, DatePipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WindowState } from '@app/core/config/window-state.config';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { PreOrderFormComponent } from '@app/modules/sales/components/pre-order-form/pre-order-form.component';
import { SalesService } from '@app/modules/sales/services/sales.service';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NotFoundComponent } from '@app/shared/components/not-found/not-found.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { SafeTextPipe } from '@app/shared/pipe/safe-text.pipe';
import { TranslateService } from '@ngx-translate/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { catchError, combineLatest, EMPTY, finalize, map, startWith, Subject, switchMap, tap } from 'rxjs';

@Component({
    selector: 'view-pre-order-details',
    imports: [PageHeaderComponent, NgZorroCustomModule, FormsModule, NotFoundComponent, LoaderComponent, DatePipe, SafeTextPipe, CommonModule, PreOrderFormComponent],
    templateUrl: './view-pre-order-details.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './view-pre-order-details.component.scss',
})
export class ViewPreOrderDetailsComponent {
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
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _salesService = inject(SalesService);
    private readonly _translateService = inject(TranslateService);

    detailUrl = computed(() => APIEndpoint.GET_PRE_ORDER_DETAILS ?? null);
    updateUrl = computed(() => APIEndpoint.UPDATE_PRE_ORDER_DETAILS ?? null);
    buttonLoading = signal(false);
    actionLoading = signal(false);

    // Modal state
    cancelVisible = false;
    cancelReason = '';
    cancelRefund = 0;
    advanceVisible = false;
    advanceAmount = 0;
    advanceMethod: string | null = null;
    advanceReference = '';

    private _reload$ = new Subject<void>();

    private _preOrder$ = combineLatest([this._reload$.pipe(startWith(undefined)), toObservable(this.detailUrl), toObservable(this.itemId)]).pipe(
        tap(() => {
            this.loading.set(true);
        }),
        switchMap(([_, url, id]) =>
            this._salesService.getDetail$(url!, id).pipe(
                map((response) => {
                    const data = response.body.data;

                    this.preOrderStats.set(data.stats ?? null);
                    this.items.set(data.items ?? []);
                    this.activityTimeline.set(data.activity?.length ? data.activity : []);

                    // The form needs its lines alongside the header.
                    return { ...data.details, items: data.items ?? [] };
                }),
                catchError((error: HttpErrorResponse | Error) => {
                    this.loading.set(false);
                    const message = error instanceof HttpErrorResponse ? `${error.error?.message || error.message}` : `Pre-order not found`;
                    this._notificationService.error('Pre-Order Detail', message);
                    return EMPTY;
                }),
                finalize(() => {
                    this.loading.set(false);
                })
            )
        )
    );

    preOrder = toSignal(this._preOrder$, { initialValue: null });

    preOrderStats = signal<any>(null);
    items = signal<any[]>([]);
    activityTimeline = signal<any[]>([]);

    // --- Derived state ---
    isOpen = computed(() => {
        const status = this.preOrder()?.status;
        return status === 'Pending' || status === 'Confirmed';
    });
    isPending = computed(() => this.preOrder()?.status === 'Pending');
    isConverted = computed(() => this.preOrder()?.status === 'Converted');

    // All-or-nothing gate: every booked line must be fulfillable before this
    // booking can become an order.
    isReadyToConvert = computed(() => {
        const lines = this.items();
        return lines.length > 0 && lines.every((i) => i.is_ready);
    });
    blockingLines = computed(() => this.items().filter((i) => !i.is_ready));

    convertTooltip = computed(() => {
        if (!this.isOpen()) return 'Only an open pre-order can be converted';
        if (this.isReadyToConvert()) return 'Open the order page with this booking prefilled';
        const blocking = this.blockingLines();
        return `Not enough stock for ${blocking.length} item(s): ${blocking.map((i) => i.product_name).join(', ')}`;
    });

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
        this._salesService
            .updateItem$(this.updateUrl(), $event.data)
            .pipe(
                catchError((err) => {
                    const message = err instanceof HttpErrorResponse ? `Failed to update pre-order: ${err.error?.message || err.message}` : `Failed to update pre-order`;
                    this._notificationService.error('Pre-Order Update', message);
                    return EMPTY;
                }),
                finalize(() => {
                    this.buttonLoading.set(false);
                })
            )
            .subscribe({
                next: (response) => {
                    if (response.status === 200 && response.body?.code === 200) {
                        this._reload$.next();
                        this.editMode = false;
                    } else {
                        const notificationRef = this._notificationService.warning('Pre-Order Update', response.body?.message || 'Unable To Update Pre-Order');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                        });
                    }
                },
            });
    }

    // --- Lifecycle actions ---
    private _act(url: string, body: any, successMessage: string, onDone?: () => void): void {
        this.actionLoading.set(true);
        this._salesService
            .postAction$(url, body)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => this.actionLoading.set(false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this._notificationService.success('Pre-Order', successMessage);
                        onDone?.();
                        this._reload$.next();
                    } else {
                        this._notificationService.warning('Pre-Order', res.body?.message || 'Action could not be completed');
                    }
                },
                error: (err: any) => this._notificationService.error('Blocked', err?.error?.message || 'Action failed'),
            });
    }

    confirmPreOrder(): void {
        this._act(APIEndpoint.CONFIRM_PRE_ORDER, { oid: this.itemId() }, 'Pre-order confirmed');
    }

    openCancel(): void {
        this.cancelReason = '';
        this.cancelRefund = 0;
        this.cancelVisible = true;
    }

    submitCancel(): void {
        if (!this.cancelReason.trim()) {
            this._notificationService.warning('Pre-Order', 'A cancellation reason is required');
            return;
        }
        this._act(APIEndpoint.CANCEL_PRE_ORDER, { oid: this.itemId(), reason: this.cancelReason.trim(), advance_refunded: Number(this.cancelRefund || 0) }, 'Pre-order cancelled', () => (this.cancelVisible = false));
    }

    openAdvance(): void {
        const current = this.preOrder();
        this.advanceAmount = Number(current?.advance_paid || 0);
        this.advanceMethod = current?.advance_method || null;
        this.advanceReference = current?.advance_reference || '';
        this.advanceVisible = true;
    }

    submitAdvance(): void {
        this._act(
            APIEndpoint.RECORD_PRE_ORDER_ADVANCE,
            {
                oid: this.itemId(),
                advance_paid: Number(this.advanceAmount || 0),
                advance_method: this.advanceMethod || null,
                advance_reference: this.advanceReference || null,
            },
            'Advance recorded',
            () => (this.advanceVisible = false)
        );
    }

    // --- Conversion ---
    // Hands the whole booking to the order page. Product lines arrive WITHOUT a
    // batch: the admin picks one per line there and confirms each, because the
    // system must never guess which batch a booked line meant.
    createOrder(): void {
        if (!this.isReadyToConvert()) {
            this._notificationService.warning('Pre-Order', this.convertTooltip());
            return;
        }
        this._router.navigate(['/sales/online'], {
            state: { fromPreOrderOid: this.itemId() },
        });
    }

    viewConvertedOrder(): void {
        const orderOid = this.preOrder()?.converted_order_oid;
        if (!orderOid) return;
        this._router.navigate([`/sales/orders/view/${orderOid}`]);
    }

    // --- Reports ---
    generatePreOrderReport(): void {
        this.generateReport(APIEndpoint.GENERATE_PRE_ORDER_REPORT, { oid: this.itemId() }, 'pre_order_report');
    }

    exportPreOrderData(): void {
        this.generateReport(APIEndpoint.EXPORT_PRE_ORDER_DATA, {}, 'pre_order_export');
    }

    generateReport(path: any, payload: any, report_key: string): void {
        this.loadingReportKey.set(report_key);
        this._salesService
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
                    a.download = decodeURIComponent(fileName);
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
