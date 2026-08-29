import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { UserFormComponent } from '@app/modules/admin/components/user/user-form/user-form.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

@Component({
  selector: 'update-profile',
  imports: [LoaderComponent, CommonModule, UserFormComponent],
  templateUrl: './update-profile.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './update-profile.component.scss',
})
export class UpdateProfileComponent implements OnInit {
  profileDetails: any;
  loading: boolean = false;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _location: Location
  ) {}

  ngOnInit() {
    this.getProfileDetails();
  }

  getProfileDetails() {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_PROFILE_INFO)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          this.profileDetails = res?.body?.data;
          console.log(this.profileDetails);
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  handleActions(event: any): any {
    // Update
    if (event.action === 'submit') {
      this.updateUserDetails(event.value);
    } else if (event.action === 'back') {
      this.goBack();
    }
  }

  goBack(): any {
    this._location.back();
  }

  updateUserDetails(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.UPDATE_USER_DETAILS, payload)
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
