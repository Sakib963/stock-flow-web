import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpService } from '@app/core/services/http.service';
import { ActivatedRoute } from '@angular/router';
import { finalize, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { UserFormComponent } from '@app/modules/admin/components/user/user-form/user-form.component';

@Component({
  selector: 'app-view-user-details',
  standalone: true,
  imports: [CommonModule, LoaderComponent, UserFormComponent],
  templateUrl: './view-user-details.component.html',
  styleUrls: ['./view-user-details.component.scss'],
})
export class ViewUserDetailsComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;

  userDetails: any;

  constructor(
    private _httpService: HttpService,
    private _location: Location,
    private _destroyRef: DestroyRef,
    private _activatedRoute: ActivatedRoute,
    private _notificationService: NzNotificationService
  ) {
    const state$ = this._activatedRoute.paramMap.pipe(
      map(() => window.history.state)
    );
    state$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((res: any) => {
      this.editMode = res.edit;
      console.log(this.editMode);
    });
  }

  ngOnInit(): void {
    this.loadUserDetails();
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

  loadUserDetails(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_USER_DETAILS, { oid: this.oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.body.code === 200) {
            this.userDetails = res.body?.data;
          }
        },
        error: (err: any) => {
          console.error(err.message);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
