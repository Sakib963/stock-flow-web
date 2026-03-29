import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, finalize } from 'rxjs';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { PurchaseOrderFormComponent } from '@app/modules/manager/components/inventory/purchase-order/purchase-order-form/purchase-order-form.component';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { DangerButton } from '@app/shared/components/buttons/danger-button/danger-button.component';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { OrderVerificationFormComponent } from '@app/modules/manager/components/inventory/purchase-order/order-verification-form/order-verification-form.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-view-purchase-order',
    imports: [CommonModule, LoaderComponent, PurchaseOrderFormComponent, SecondaryButton, NgZorroCustomModule, PrimaryButton, DangerButton, OrderVerificationFormComponent],
    templateUrl: './view-purchase-order.component.html',
    styleUrls: ['./view-purchase-order.component.scss'],
})
export class ViewPurchaseOrderComponent implements OnInit {
    @Input() oid: any;
    editMode: boolean = false;
    loading: boolean = false;

    reportLoading: boolean = false;

    purchaseDetails: any;
    products: any[] = [];
    productsWithCostData: any[] = [];
    currentTotalPrice: any;

    purchaseTypes = DROPDOWN_OPTIONS.PURCHASE_TYPES;
    paymentStatuses = DROPDOWN_OPTIONS.PAYMENT_STATUS;

    displayFormType: any = '';

    constructor(
        private _httpService: HttpService,
        private _destroyRef: DestroyRef,
        private _notificationService: NzNotificationService,
        private _activatedRoute: ActivatedRoute,
        private _router: Router,
        private _location: Location,
        private _authService: AuthService,
        private _modal: NzModalService,
        private _translateService: TranslateService
    ) {
        const state$ = this._activatedRoute.paramMap.pipe(map(() => window.history.state));
        state$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((res: any) => {
            this.editMode = res.edit;
        });
    }

    ngOnInit(): void {
        this.loadPurchaseDetails();
    }

    goBack(): void {
        this._location.back();
    }

    handleActions(event: any): any {
        // Update
        if (event.action === 'submit') {
            this.updatePurchaseDetails(event.value);
        } else if (event.action === 'back') {
            this.goBack();
        }
    }

    updatePurchaseDetails(payload: any): any {
        this.loading = true;
        this._httpService
            .post(APIEndpoint.UPDATE_PURCHASE_DETAILS, payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    this._notificationService.success('Success!', res?.body?.message);
                    this._location.back();
                },
                error: (err: any) => {
                    console.log(err);
                    this._notificationService.error('Error!', err?.error?.message);
                },
            });
    }

    loadPurchaseDetails(): any {
        this.loading = true;
        this._httpService
            .get(APIEndpoint.GET_PURCHASE_DETAILS, { oid: this.oid })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) {
                        this.purchaseDetails = res?.body?.data;
                        this.products = this.purchaseDetails.products;
                        this.productsWithCostData = this.products.filter((p) => this.hasCostData(p));
                        // 🧮 Calculate total price
                        this.currentTotalPrice = this.products.reduce((acc: number, product: any) => {
                            return acc + product.quantity * product.unit_price;
                        }, 0);
                    }
                },
                error: (err: any) => {
                    console.log(err);
                    this._notificationService.error('Error!', err?.error?.message);
                },
            });
    }

    calculateTotalPrice(product: any): number {
        if (!product.unit_price && !product.quantity) return 0;

        return Number(product.unit_price) * Number(product.quantity);
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

        return adRunCost > 0 || packagingCost > 0 || giftCost > 0 || contentCreationCost > 0 || influencerCost > 0;
    }

    get hasAnyCostData(): boolean {
        return this.products.some((product) => this.hasCostData(product));
    }

    costFieldExists(value: any): boolean {
        return Number(value || 0) > 0;
    }

    hasForSaleProductsWithCost(): boolean {
        return this.products.some((p) => p.intended_use === 'for_sale' && this.hasCostData(p));
    }

    getPurchaseType(key: any): any {
        const item = this.purchaseTypes.find((item: any) => item.value === key);

        if (item) return item.label;
        return key;
    }

    getPaymentStatus(key: any): any {
        const item = this.paymentStatuses.find((item: any) => item.value === key);

        if (item) return item.label;
        return key;
    }

    getVerificationButtonStatus(): boolean {
        if (
            this.purchaseDetails.status === 'Submitted'
            //  && this._authService._userInfo().email !== this.purchaseDetails?.created_by
        )
            return true;
        return false;
    }

    getCancelButtonStatus(): boolean {
        if (this.purchaseDetails.status === 'Submitted' && this._authService._userInfo().email === this.purchaseDetails?.created_by) return true;
        return false;
    }

    displayCancelConfirmation(): void {
        console.log('purchase cancel');
        let message = 'Do you want to cancel this purchase?';
        this._modal.create({
            nzContent: ConfirmationModalComponent,
            nzData: {
                message,
            },
            nzFooter: null,
            nzClosable: false,
            nzOnOk: () => this.handleCancelPurchaseOrder(),
        });
    }

    handleCancelPurchaseOrder(): any {
        this.loading = true;
        this._httpService
            .get(APIEndpoint.CANCEL_PURCHASE, { oid: this.oid })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) {
                        this._notificationService.success('Success!', res?.body?.message);
                        this._location.back();
                    }
                },
                error: (err: any) => {
                    console.log(err);
                    this._notificationService.error('Error!', err?.error?.message);
                },
            });
    }

    handleVerifyPurchaseOrder(): void {
        this.displayFormType = 'Verify';
    }

    handleVerificationFormActions(event: any): void {
        if (event.action === 'cancel') {
            this.displayFormType = '';
        } else {
            this.loading = true;
            this._httpService
                .post(APIEndpoint.VERIFY_PURCHASE, event.value)
                .pipe(
                    takeUntilDestroyed(this._destroyRef),
                    finalize(() => (this.loading = false))
                )
                .subscribe({
                    next: (res: any) => {
                        this._notificationService.success('Success!', res?.body?.message);
                        this._location.back();
                    },
                    error: (err: any) => {
                        console.log(err);
                        this._notificationService.error('Error!', err?.error?.message);
                    },
                });
        }
    }

    getStatusClass(status: any): any {
        if (status === 'Verified') return 'font-semibold text-green-600';
        if (status === 'Cancelled') return 'font-semibold text-red-600';
        return 'font-semibold';
    }

    generatePurchaseReport(): void {
        this.reportLoading = true;

        this._httpService
            .downloadFile(APIEndpoint.GET_PURCHASE_ORDER_REPORT, { oid: this.oid })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.reportLoading = false))
            )
            .subscribe({
                next: (res: any) => {
                    const blob: Blob = res.body;
                    if (!blob) {
                        this._notificationService.info(this._translateService.instant('common.notification.title.info'), this._translateService.instant('common.notification.no_data_found'));
                        return;
                    }

                    const now = new Date();
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const timestamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}`;

                    const fileName = `purchase_order_${timestamp}.xlsx`;

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
