import { Component, DestroyRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { PurchaseFormComponent } from '@app/modules/manager/components/inventory/purchase/purchase-form/purchase-form.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-create-product-purchase',
  standalone: true,
  imports: [CommonModule, PurchaseFormComponent],
  templateUrl: './create-product-purchase.component.html',
  styleUrls: ['./create-product-purchase.component.scss']
})
export class CreateProductPurchaseComponent {
  loading: boolean = false;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _location: Location,
    private _notificationService: NzNotificationService
  ) {}

  handleActions(event: any): any {
    if (event.action === 'submit') {
      this.handleCreate(event.value);
    } else if (event.action === 'back') {
      this._location.back();
    }
  }

  handleCreate(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.CREATE_PURCHASE, payload)
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
