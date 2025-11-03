import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { BrandFormComponent } from '@app/modules/manager/components/configuration/brands/brand-form/brand-form.component';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

@Component({
  selector: 'create-brand',
    imports: [CommonModule, BrandFormComponent],
  templateUrl: './create-brand.component.html',
  styleUrl: './create-brand.component.scss'
})
export class CreateBrandComponent {
  loading: boolean = false;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _location: Location,
    private _notificationService: NzNotificationService
  ) {}

  handleActions(event: any): any {
    if (event.action === 'submit') {
      this.handleCreateBrand(event.value);
    } else if (event.action === 'back') {
      this._location.back();
    }
  }

  handleCreateBrand(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.CREATE_BRAND, payload)
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
