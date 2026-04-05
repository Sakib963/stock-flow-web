import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { WindowState } from '@app/core/config/window-state.config';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { HttpService } from '@app/core/services/http.service';
import { OrderVerificationFormComponent } from '@app/modules/inventory/components/purchase-order/order-verification-form/order-verification-form.component';
import { PurchaseOrderFormComponent } from '@app/modules/inventory/components/purchase-order/purchase-order-form/purchase-order-form.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { CurrencyFormatPipe } from '@app/shared/pipe/currency-format.pipe';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

@Component({
    selector: 'view-purchase-order',
    imports: [CommonModule, NgZorroCustomModule, PageHeaderComponent, LoaderComponent, OrderVerificationFormComponent, PurchaseOrderFormComponent, CurrencyFormatPipe, FormsModule],
    templateUrl: './view-purchase-order.component.html',
    styleUrl: './view-purchase-order.component.scss',
})
export class ViewPurchaseOrderComponent implements OnInit {
    loading = false;
    actionLoading = false;
    reportLoading = false;
    editMode = false;
    displayFormType = '';
    currentProductsView = 0;
    currentCostBreakdownView = 0;

    purchaseOrder = signal<any | null>(null);
    products: any[] = [];
    stats: any = null;
    activity: any[] = [];
    costDetails: any[] = [];
    productsWithCostData: any[] = [];

    state = signal<WindowState | null>(null);
    action = computed(() => this.state()?.action || 'view');
    editable = computed(() => this.action() === 'view' && this.canEdit);
    private readonly _verificationSectionId = 'purchase-order-verification-form';

    private readonly _httpService = inject(HttpService);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _activatedRoute = inject(ActivatedRoute);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _modalService = inject(NzModalService);
    private readonly _location = inject(Location);

    ngOnInit(): void {
        this.state.set(window.history.state as WindowState);
        this.editMode = typeof window !== 'undefined' && window.history.state?.edit === true;
        this.loadDetails();
    }

    handleSwitchChange(event: boolean): void {
        if (!this.canEdit) {
            this.editMode = false;
            return;
        }
        this.editMode = event;
    }

    get canEdit(): boolean {
        return this.purchaseOrder()?.status === 'Submitted';
    }

    get canVerify(): boolean {
        return this.purchaseOrder()?.status === 'Submitted';
    }

    get canCancel(): boolean {
        return this.purchaseOrder()?.status === 'Submitted';
    }

    get editFormData(): any {
        const purchaseOrder = this.purchaseOrder();
        if (!purchaseOrder) {
            return null;
        }

        return {
            ...purchaseOrder,
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

                        this.purchaseOrder.set(bodyData.details || bodyData);
                        this.products = bodyData.products || bodyData?.products || [];
                        this.costDetails = (bodyData.cost_details || []).filter((item: any) => this.hasCostData(item));
                        this.productsWithCostData = this.costDetails.length ? this.costDetails : this.products.filter((p) => this.hasCostData(p));
                        this.stats = bodyData.stats || null;
                        this.activity = bodyData.activity || [];
                        this.displayFormType = '';

                        if (!this.canEdit) {
                            this.editMode = false;
                        }

                        if (this.editMode && !this.canEdit) {
                            this.editMode = false;
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
        if (!this.canVerify || !this.purchaseOrder()?.oid) {
            return;
        }

        this.displayFormType = 'Verify';
        this.scrollToVerificationForm();
    }

    private scrollToVerificationForm(attempt = 0): void {
        if (typeof window === 'undefined') {
            return;
        }

        const section = document.getElementById(this._verificationSectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        // The form is rendered conditionally; retry briefly until it appears in DOM.
        if (attempt < 6) {
            window.setTimeout(() => this.scrollToVerificationForm(attempt + 1), 70);
        }
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
        if (!this.canCancel || !this.purchaseOrder()?.oid) {
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
        const purchaseOrder = this.purchaseOrder();
        this._httpService
            .get(APIEndpoint.CANCEL_PURCHASE, { oid: purchaseOrder?.oid })
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
        if (!this.purchaseOrder()?.oid) {
            return;
        }

        this.reportLoading = true;
        this._httpService
            .downloadFile(APIEndpoint.GET_PURCHASE_ORDER_REPORT_INVENTORY, { oid: this.purchaseOrder()?.oid })
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
        if (!this.purchaseOrder()?.oid) {
            return;
        }

        this.reportLoading = true;
        this._httpService
            .downloadFile(APIEndpoint.GET_PURCHASE_ORDER_PRODUCTS_REPORT_INVENTORY, { oid: this.purchaseOrder()?.oid })
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

    getTotalExtraCost(item: any): number {
        const adRunCost = Number(item?.ad_run_cost || 0);
        const packagingCost = Number(item?.packaging_cost || 0);
        const giftCost = Number(item?.gift_cost || 0);
        const contentCreationCost = Number(item?.content_creation_cost || 0);
        const influencerCost = Number(item?.influencer_cost || 0);

        return adRunCost + packagingCost + giftCost + contentCreationCost + influencerCost;
    }

    getUnitProfit(item: any): number {
        if (item?.intended_use !== 'for_sale') {
            return 0;
        }

        const sellingPrice = Number(item?.selling_price || 0);
        const verifiedUnitPrice = Number(item?.verified_unit_price || 0);
        return sellingPrice - verifiedUnitPrice - this.getTotalExtraCost(item);
    }

    hasCostData(item: any): boolean {
        const adRunCost = Number(item?.ad_run_cost || 0);
        const packagingCost = Number(item?.packaging_cost || 0);
        const giftCost = Number(item?.gift_cost || 0);
        const contentCreationCost = Number(item?.content_creation_cost || 0);
        const influencerCost = Number(item?.influencer_cost || 0);
        const costRemarks = `${item?.cost_remarks || ''}`.trim();

        return adRunCost > 0 || packagingCost > 0 || giftCost > 0 || contentCreationCost > 0 || influencerCost > 0 || !!costRemarks;
    }

    get hasAnyCostData(): boolean {
        return this.productsWithCostData.length > 0;
    }

    costFieldExists(value: any): boolean {
        if (value === null || value === undefined || value === '') {
            return false;
        }
        return Number(value || 0) > 0;
    }

    hasForSaleProductsWithCost(): boolean {
        return this.productsWithCostData.some((p) => p.intended_use === 'for_sale');
    }

    get verificationFormProducts(): any[] {
        if (!this.products?.length) {
            return [];
        }

        if (!this.costDetails?.length) {
            return this.products;
        }

        const costByPurchaseDetailOid = new Map(this.costDetails.map((item) => [item.oid, item]));

        return this.products.map((product) => {
            const cost = costByPurchaseDetailOid.get(product.oid);
            if (!cost) {
                return product;
            }

            return {
                ...product,
                ad_run_cost: cost.ad_run_cost ?? null,
                packaging_cost: cost.packaging_cost ?? null,
                gift_cost: cost.gift_cost ?? null,
                content_creation_cost: cost.content_creation_cost ?? null,
                influencer_cost: cost.influencer_cost ?? null,
                cost_remarks: cost.cost_remarks ?? null,
                intended_use: product.intended_use ?? cost.intended_use ?? null,
                selling_price: product.selling_price ?? cost.selling_price ?? null,
                maximum_discount: product.maximum_discount ?? cost.maximum_discount ?? null,
            };
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
