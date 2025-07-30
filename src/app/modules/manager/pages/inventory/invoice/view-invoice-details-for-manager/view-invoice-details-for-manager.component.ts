import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ViewInvoiceComponent } from '@app/modules/sales/components/invoice/view-invoice/view-invoice.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { TranslateModule } from '@ngx-translate/core';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';

@Component({
  selector: 'view-invoice-details-for-manager',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NgZorroCustomModule,
    LoaderComponent,
    SecondaryButton,
  ],
  templateUrl: './view-invoice-details-for-manager.component.html',
  styleUrls: ['./view-invoice-details-for-manager.component.scss'],
})
export class ViewInvoiceDetailsForManagerComponent implements OnInit {
  @Input() oid: any;
  loading: boolean = false;
  invoiceDetails: any;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _location: Location
  ) {}

  ngOnInit(): void {
    this.loadInvoiceDetails();
  }

  handleActions(event: any): void {
    if (event.action === 'back') {
      this._location.back();
    } else if (event.action === 'return') {
      this.saveProductReturn(event.value);
    }
  }

  getPaymentMethod(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'cash':
        return 'sales.quick_sale.payment_info.payment_method.options.cash';
      case 'bank_transfer':
        return 'sales.quick_sale.payment_info.payment_method.options.bkash';
      default:
        return '-';
    }
  }

  getPaymentStatus(paymentStatus: string): string {
    switch (paymentStatus) {
      case 'unpaid':
        return 'sales.quick_sale.payment_info.payment_status.options.unpaid';
      case 'partially_paid':
        return 'sales.quick_sale.payment_info.payment_status.options.partially_paid';
      case 'paid':
        return 'sales.quick_sale.payment_info.payment_status.options.paid';
      default:
        return '-';
    }
  }

  goBack() {
    this._location.back();
  }

  loadInvoiceDetails(): void {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_INVOICE_DETAILS, { oid: this.oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.invoiceDetails = res?.body?.data;
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  saveProductReturn(data: any): void {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.SAVE_PRODUCT_RETURN, data)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this._notificationService.success(
              'Success!',
              'Product return saved successfully.'
            );
            this._location.back();
          } else {
            this._notificationService.error('Error!', res?.body?.message);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
