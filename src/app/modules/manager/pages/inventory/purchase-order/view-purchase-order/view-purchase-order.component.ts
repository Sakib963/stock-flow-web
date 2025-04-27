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

@Component({
  selector: 'app-view-purchase-order',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    PurchaseOrderFormComponent,
    SecondaryButton,
    NgZorroCustomModule,
    PrimaryButton,
    DangerButton,
    OrderVerificationFormComponent,
  ],
  templateUrl: './view-purchase-order.component.html',
  styleUrls: ['./view-purchase-order.component.scss'],
})
export class ViewPurchaseOrderComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;

  purchaseDetails: any;
  products: any[] = [];
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
    private _modal: NzModalService
  ) {
    const state$ = this._activatedRoute.paramMap.pipe(
      map(() => window.history.state)
    );
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
            // 🧮 Calculate total price
            this.currentTotalPrice = this.products.reduce(
              (acc: number, product: any) => {
                return acc + product.quantity * product.unit_price;
              },
              0
            );
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
      this.purchaseDetails.status === 'Submitted' &&
      this._authService._userInfo().email !== this.purchaseDetails?.created_by
    )
      return true;
    return false;
  }

  getCancelButtonStatus(): boolean {
    if (
      this.purchaseDetails.status === 'Submitted' &&
      this._authService._userInfo().email === this.purchaseDetails?.created_by
    )
      return true;
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
}
