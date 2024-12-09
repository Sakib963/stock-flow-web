import { Component, DestroyRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { UserFormComponent } from '@app/modules/admin/components/user/user-form/user-form.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpService } from '@app/core/services/http.service';
import { finalize } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { NzNotificationService } from 'ng-zorro-antd/notification';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, UserFormComponent],
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss'],
})
export class CreateUserComponent {
  loading: boolean = false;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _location: Location,
    private _notificationService: NzNotificationService
  ) {}

  handleActions(event: any): any {
    if (event.action === 'submit') {
      this.handleCreateUser(event.value);
    }
  }

  handleCreateUser(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.CREATE_USER, payload)
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
