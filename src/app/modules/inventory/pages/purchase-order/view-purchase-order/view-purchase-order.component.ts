import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { HttpService } from '@app/core/services/http.service';
import { OrderVerificationFormComponent } from '@app/modules/inventory/components/purchase-order/order-verification-form/order-verification-form.component';
import { PurchaseOrderFormComponent } from '@app/modules/inventory/components/purchase-order/purchase-order-form/purchase-order-form.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

@Component({
    selector: 'view-purchase-order',
    imports: [CommonModule, NgZorroCustomModule, PageHeaderComponent, LoaderComponent, OrderVerificationFormComponent, PurchaseOrderFormComponent],
    templateUrl: './view-purchase-order.component.html',
    styleUrl: './view-purchase-order.component.scss',
})
export class ViewPurchaseOrderComponent implements OnInit {
    loading = false;
    actionLoading = false;
    reportLoading = false;
    editMode = false;
    displayFormType = '';

    purchaseOrder: any = null;
    products: any[] = [];
    stats: any = null;
    activity: any[] = [];

    private readonly _httpService = inject(HttpService);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _activatedRoute = inject(ActivatedRoute);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _modalService = inject(NzModalService);
    private readonly _location = inject(Location);

    ngOnInit(): void {
        this.editMode = typeof window !== 'undefined' && window.history.state?.edit === true;
        this.loadDetails();
    }

    get canEdit(): boolean {
        return this.purchaseOrder?.status === 'Submitted';
    }

    get canVerify(): boolean {
        return this.purchaseOrder?.status === 'Submitted';
    }

    get canCancel(): boolean {
        return this.purchaseOrder?.status === 'Submitted';
    }

    get editFormData(): any {
        if (!this.purchaseOrder) {
            return null;
        }

        return {
            ...this.purchaseOrder,
            products: this.products,
        };
    }

    loadDetails(): void {
        const oid = this._activatedRoute.snapshot.paramMap.get('oid');
        if (!oid) {
            this._notificationService.error('Purchase Order', 'Invalid purchase order identifier');
            return;
        }

        this.loading = true;
        this._httpService
            .get(`${APIEndpoint.GET_PURCHASE_DETAILS}/${oid}`)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.loading = false;
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.status === 200 && res?.body?.code === 200) {
                        const bodyData = res.body.data || {};

                        this.purchaseOrder = bodyData.details || bodyData;
                        this.products = bodyData.products || bodyData?.products || [];
                        this.stats = bodyData.stats || null;
                        this.activity = bodyData.activity || [];
                        this.displayFormType = '';

                        if (!this.canEdit) {
                            this.editMode = false;
                        }

                        if (this.editMode && !this.canEdit) {
                            this._notificationService.warning('Purchase Order', 'Only submitted purchase orders can be edited.');
                        }
                        return;
                    }

                    this._notificationService.error('Purchase Order', res?.body?.message || 'Unable to load purchase order details');
                },
                error: (err: any) => {
                    this._notificationService.error('Purchase Order', err?.error?.message || 'Failed to load purchase order details');
                },
            });
    }

    verifyOrder(): void {
        if (!this.canVerify || !this.purchaseOrder?.oid) {
            return;
        }

        this.displayFormType = 'Verify';
    }

    handleVerificationFormActions(event: FormActions): void {
        if (event.action === 'cancel') {
            this.displayFormType = '';
            return;
        }

        this.actionLoading = true;
        this._httpService
            .post(APIEndpoint.VERIFY_PURCHASE, event.data)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.actionLoading = false;
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.status === 200 && res?.body?.code === 200) {
                        this._notificationService.success('Purchase Order', res?.body?.message || 'Purchase order verified successfully');
                        this.loadDetails();
                        return;
                    }

                    this._notificationService.error('Purchase Order', res?.body?.message || 'Unable to verify purchase order');
                },
                error: (err: any) => {
                    this._notificationService.error('Purchase Order', err?.error?.message || 'Failed to verify purchase order');
                },
            });
    }

    cancelOrder(): void {
        if (!this.canCancel || !this.purchaseOrder?.oid) {
            return;
        }

        this._modalService.confirm({
            nzTitle: 'Cancel Purchase Order',
            nzContent: 'This will cancel the order. Do you want to continue?',
            nzOkText: 'Cancel Order',
            nzCancelText: 'Keep Order',
            nzOnOk: () => this.confirmCancelOrder(),
        });
    }

    private confirmCancelOrder(): void {
        this.actionLoading = true;
        this._httpService
            .get(APIEndpoint.CANCEL_PURCHASE, { oid: this.purchaseOrder.oid })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.actionLoading = false;
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.status === 200 && res?.body?.code === 200) {
                        this._notificationService.success('Purchase Order', res?.body?.message || 'Purchase order cancelled successfully');
                        this.loadDetails();
                        return;
                    }

                    this._notificationService.error('Purchase Order', res?.body?.message || 'Unable to cancel purchase order');
                },
                error: (err: any) => {
                    this._notificationService.error('Purchase Order', err?.error?.message || 'Failed to cancel purchase order');
                },
            });
    }

    navigateBack(): void {
        this._location.back();
    }

    handleEditFormActions(event: FormActions): void {
        if (event.action === 'cancel') {
            this.editMode = false;
            return;
        }

        this.updatePurchaseDetails(event.data);
    }

    private updatePurchaseDetails(payload: any): void {
        this.actionLoading = true;
        this._httpService
            .post(APIEndpoint.UPDATE_PURCHASE_DETAILS, payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.actionLoading = false;
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.status === 200 && res?.body?.code === 200) {
                        this._notificationService.success('Purchase Order', res?.body?.message || 'Purchase order updated successfully');
                        this.editMode = false;
                        this.loadDetails();
                        return;
                    }

                    this._notificationService.error('Purchase Order', res?.body?.message || 'Unable to update purchase order');
                },
                error: (err: any) => {
                    this._notificationService.error('Purchase Order', err?.error?.message || 'Failed to update purchase order');
                },
            });
    }

    generatePurchaseReport(): void {
        if (!this.purchaseOrder?.oid) {
            return;
        }

        this.reportLoading = true;
        this._httpService
            .downloadFile(APIEndpoint.GET_PURCHASE_ORDER_REPORT_INVENTORY, { oid: this.purchaseOrder.oid })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.reportLoading = false;
                })
            )
            .subscribe({
                next: (res: any) => this.downloadBlob(res?.body, 'purchase_order_report'),
                error: (err: any) => {
                    this._notificationService.error('Purchase Report', err?.error?.message || 'Failed to generate purchase report');
                },
            });
    }

    exportProductsReport(): void {
        if (!this.purchaseOrder?.oid) {
            return;
        }

        this.reportLoading = true;
        this._httpService
            .downloadFile(APIEndpoint.GET_PURCHASE_ORDER_PRODUCTS_REPORT_INVENTORY, { oid: this.purchaseOrder.oid })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.reportLoading = false;
                })
            )
            .subscribe({
                next: (res: any) => this.downloadBlob(res?.body, 'purchase_order_products_report'),
                error: (err: any) => {
                    this._notificationService.error('Products Report', err?.error?.message || 'Failed to export product report');
                },
            });
    }

    private downloadBlob(blob: Blob, filePrefix: string): void {
        if (!blob) {
            this._notificationService.warning('Report', 'No data found for report');
            return;
        }

        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const timestamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}`;
        const fileName = `${filePrefix}_${timestamp}.xlsx`;

        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.URL.revokeObjectURL(url);
    }
}
