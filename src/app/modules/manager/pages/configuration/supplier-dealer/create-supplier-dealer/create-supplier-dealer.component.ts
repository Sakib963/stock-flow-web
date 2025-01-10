import { Component, DestroyRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { SupplierDealerFormComponent } from '@app/modules/manager/components/configuration/supplier-dealer/supplier-dealer-form/supplier-dealer-form.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-create-supplier-dealer',
  standalone: true,
  imports: [CommonModule, SupplierDealerFormComponent],
  templateUrl: './create-supplier-dealer.component.html',
  styleUrls: ['./create-supplier-dealer.component.scss']
})
export class CreateSupplierDealerComponent {
  loading: boolean = false;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _location: Location,
    private _notificationService: NzNotificationService
  ) {}

  handleActions(event: any): any {
    if (event.action === 'submit') {
      this.handleCreateSupplierDealer(event.value);
    } else if (event.action === 'back') {
      this._location.back();
    }
  }

  handleCreateSupplierDealer(payload: any): any {
    this.loading = true;
    console.log(payload);
    
    this._httpService
      .post(APIEndpoint.CREATE_SUPPLIER_DEALER, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          this._notificationService.success("Success!", res?.body?.message)
          this._location.back();
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error("Error!", err?.error?.message)
        },
      });
  }
}
