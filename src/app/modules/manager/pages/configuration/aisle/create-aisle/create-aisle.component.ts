import { Component, DestroyRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { AisleFormComponent } from '@app/modules/manager/components/configuration/aisle/aisle-form/aisle-form.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-create-aisle',
  standalone: true,
  imports: [CommonModule, AisleFormComponent],
  templateUrl: './create-aisle.component.html',
  styleUrls: ['./create-aisle.component.scss'],
})
export class CreateAisleComponent {
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
      .post(APIEndpoint.CREATE_AISLE, payload)
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
