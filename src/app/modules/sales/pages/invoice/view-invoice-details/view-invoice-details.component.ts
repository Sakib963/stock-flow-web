import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { finalize } from 'rxjs';
import { ViewInvoiceComponent } from '@app/modules/sales/components/invoice/view-invoice/view-invoice.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';

@Component({
  selector: 'view-invoice-details',
  standalone: true,
  imports: [CommonModule, ViewInvoiceComponent, LoaderComponent],
  templateUrl: './view-invoice-details.component.html',
  styleUrls: ['./view-invoice-details.component.scss'],
})
export class ViewInvoiceDetailsComponent implements OnInit {
  @Input() invoiceId: any;
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

  loadInvoiceDetails(): void {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_INVOICE_DETAILS, { oid: this.invoiceId })
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
