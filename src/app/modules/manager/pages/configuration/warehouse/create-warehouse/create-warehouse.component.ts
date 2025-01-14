import { Component, DestroyRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { WarehouseFormComponent } from '@app/modules/manager/components/configuration/warehouse/warehouse-form/warehouse-form.component';

@Component({
  selector: 'app-create-warehouse',
  standalone: true,
  imports: [CommonModule, WarehouseFormComponent],
  templateUrl: './create-warehouse.component.html',
  styleUrls: ['./create-warehouse.component.scss']
})
export class CreateWarehouseComponent {
  loading: boolean = false;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _location: Location,
    private _notificationService: NzNotificationService
  ) {}

  handleActions(event: any): any {
    if (event.action === 'submit') {
      this.handleCreateProduct(event.value);
    } else if (event.action === 'back') {
      this._location.back();
    }
  }

  handleCreateProduct(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.CREATE_WAREHOUSE, payload)
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
