import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, finalize } from 'rxjs';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { EmployeeAttendanceFormComponent } from '@app/modules/manager/components/employee/attendance/employee-attendance-form/employee-attendance-form.component';
@Component({
  selector: 'app-view-employee-attendance-details',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    SecondaryButton,
    NgZorroCustomModule,
    EmployeeAttendanceFormComponent,
  ],
  templateUrl: './view-employee-attendance-details.component.html',
  styleUrls: ['./view-employee-attendance-details.component.scss'],
})
export class ViewEmployeeAttendanceDetailsComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;

  itemDetails: any;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _activatedRoute: ActivatedRoute,
    private _location: Location
  ) {
    const state$ = this._activatedRoute.paramMap.pipe(
      map(() => window.history.state)
    );
    state$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((res: any) => {
      this.editMode = res.edit;
    });
  }

  ngOnInit(): void {
    this.loadItemDetails();
  }

  goBack(): void {
    this._location.back();
  }

  handleActions(event: any): any {
    if (event.action === 'submit') {
      this.updateItemDetails(event.value);
    } else if (event.action === 'back') {
      this.goBack();
    }
  }

  updateItemDetails(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.UPDATE_EMPLOYEE_ATTENDANCE, payload)
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

  loadItemDetails(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_EMPLOYEE_ATTENDANCE_DETAILS, { oid: this.oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.itemDetails = res?.body?.data;
            console.log(this.itemDetails);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  convertToBangladeshTime(dateString: string): string | null {
    if (dateString) {
      const utcDate = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone: 'Asia/Dhaka',
      };

      return new Intl.DateTimeFormat('en-US', options).format(utcDate);
    }
    return null;
  }

  getTotalTime(item: any): string {
    if (!item?.attendance_date) {
      return 'Invalid data.';
    }

    const today = new Date();
    const attendanceDate = new Date(item.attendance_date);
    const isToday =
      attendanceDate.getFullYear() === today.getFullYear() &&
      attendanceDate.getMonth() === today.getMonth() &&
      attendanceDate.getDate() === today.getDate();

    const signIn = item?.sign_in_time
      ? new Date(item.sign_in_time)
      : null;
    const signOut = item?.sign_out_time
      ? new Date(item.sign_out_time)
      : null;

    // Case 1: No sign-in time for today (Absent)
    if (!signIn) {
      return isToday ? 'Not signed in yet.' : 'Absent';
    }

    // Case 2: Signed in but no sign-out
    if (signIn && !signOut) {
      return isToday ? 'Currently signed in.' : 'Missed signing out.';
    }

    // Case 3: Both sign-in and sign-out available
    if (signIn && signOut) {
      const diffMs = signOut.getTime() - signIn.getTime();
      if (diffMs <= 0) {
        return 'Invalid time range.';
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `Total Time: ${hours}h ${minutes}m`;
    }

    return 'Invalid data.';
  }

  getTotalTimeClass(item: any): string {
    const statusText = this.getTotalTime(item);

    switch (statusText) {
      case 'Absent':
      case 'Missed signing out.':
        return 'text-red-500';
      case 'Not signed in yet.':
        return 'text-yellow-500';
      case 'Currently signed in.':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  }
}
