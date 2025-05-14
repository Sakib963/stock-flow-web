import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { HttpService } from '@app/core/services/http.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Constants } from '@app/core/constants/constants';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { ViewSelfAttendanceListComponent } from '../../components/view-self-attendance-list/view-self-attendance-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    FormsModule,
    PrimaryButton,
    ReactiveFormsModule,
    ViewSelfAttendanceListComponent,
    LoaderComponent
  ],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.scss'],
})
export class AttendanceComponent implements OnInit {
  isSignedIn = false;
  isSignedOut = false;
  data: any[] = [];
  totalCount: number = 0;
  listLoading: boolean = false;
  loading: boolean = false;
  payload: any = {
    offset: 0,
    limit: Constants.PAGE_SIZE,
    month: '',
  };
  isFilter: boolean = false;
  dateControl: FormControl = new FormControl('');

  currentAttendanceStatus: any = null;

  constructor(
    private _notificationService: NzNotificationService,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.checkCurrentAttendanceStatus();
    this.setCurrentMonth();
    this.loadList();
    this.dateControl.valueChanges.subscribe((value) => {
      this.onDateChange(value);
    });
  }

  setCurrentMonth() {
    const currentDate = new Date();
    this.payload.month = currentDate.toISOString().slice(0, 7);
    this.dateControl.setValue(currentDate.toISOString().slice(0, 7));
  }

  getFormattedDate(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date().toLocaleDateString('en-US', options);
  }

  getFormattedTime(): string {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    };
    return new Date().toLocaleTimeString('en-US', options);
  }

  getButtonLabel(): string {
    if (!this.isSignedIn) return 'Sign In';
    return 'Sign Out';
  }

  handleSignInAndOut(): void {
    this.loading = true;
    const payload: any = {
      oid: this.currentAttendanceStatus?.oid ?? null,
      attendance_date: new Date(),
      attendance_time: new Date(),
      attendance_location: null,
      action: this.isSignedIn ? 'Sign Out' : 'Sign In',
    };

    // Get user location using Geolocation API
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.getStreetName(
            position.coords.latitude,
            position.coords.longitude,
            payload
          );
        },
        (error) => {
          this.loading = false;
          console.error('Geolocation error:', error);
          this._notificationService.error(
            'Error',
            'Failed to get location! Try again!'
          );
        }
      );
    } else {
      this.loading = false;
      this._notificationService.warning(
        'Warning!!',
        'Location is required for attendance. Please enable the permission for location in your browser.'
      );
    }
  }

  // Method to send the payload to your backend API
  sendPayload(payload: any): void {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.UPDATE_ATTENDANCE, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          this._notificationService.success('Success!', res?.body?.message);
          if (res.body.code === 200) {
            this.checkCurrentAttendanceStatus();
            this.loadList();
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  // Method to get street name using OpenStreetMap API
  getStreetName(latitude: number, longitude: number, payload: any): void {
    const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        this.loading = false;
        if (data.address) {
          payload.attendance_location = data.display_name;
          this.sendPayload(payload);
        } else {
          console.log('Unable to fetch address.');
          this._notificationService.error(
            'Error',
            'Failed to get location! Try again!'
          );
        }
      })
      .catch((error) => {
        this.loading = false;
        console.error('Geocoding Error:', error);
        this._notificationService.error(
          'Error',
          'Failed to get location! Try again!'
        );
      });
  }

  handleListActions(event: any): any {
    console.log(event);
  }

  onDateChange(value: string): void {
    if (value) {
      const date = new Date(value);
      this.payload.month = date.toISOString().slice(0, 7);
      this.isFilter = true;
      this.loadList();
    } else {
      this._notificationService.warning('Warning!', 'Please Select A Month!');
    }
  }

  handlePaginationEvent(event: any) {
    this.payload = {
      ...this.payload,
      offset: event.offset,
      limit: event.limit,
    };
    this.loadList();
  }

  loadList(): void {
    if (!this.isFilter) {
      this.listLoading = true;
    }
    this._httpService
      .get(APIEndpoint.GET_ATTENDANCE_LIST, this.payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.listLoading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.data = [];
            if (res.body?.data?.length) {
              this.data = res.body.data;
              this.totalCount = res.body.total;
            } else {
              this.data = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  checkCurrentAttendanceStatus(): void {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.CHECK_CURRENT_ATTENDANCE_STATUS)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.currentAttendanceStatus = res.body.data || null;

            // Adjusting isSignedIn and isSignedOut
            this.isSignedIn = !!(
              this.currentAttendanceStatus?.sign_in_time &&
              !this.currentAttendanceStatus?.sign_out_time
            );

            this.isSignedOut = !!(
              this.currentAttendanceStatus?.sign_in_time &&
              this.currentAttendanceStatus?.sign_out_time
            );
          } else {
            this.resetAttendanceStatus();
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  // Method to reset attendance status
  resetAttendanceStatus(): void {
    this.currentAttendanceStatus = null;
    this.isSignedIn = false;
    this.isSignedOut = false;
  }

  // Method to get the current attendance status text
  getAttendanceStatusText(): string {
    if (!this.currentAttendanceStatus) {
      return 'Not Signed In';
    }

    if (
      this.currentAttendanceStatus.sign_in_time &&
      !this.currentAttendanceStatus.sign_out_time
    ) {
      return 'Signed In';
    }

    if (
      this.currentAttendanceStatus.sign_in_time &&
      this.currentAttendanceStatus.sign_out_time
    ) {
      return 'Signed Out';
    }

    return 'Not Signed In';
  }

  // Method to get the current attendance time text
  getAttendanceTimeText(): string | null {
    if (!this.currentAttendanceStatus) {
      return null;
    }

    if (
      this.currentAttendanceStatus.sign_in_time &&
      !this.currentAttendanceStatus.sign_out_time
    ) {
      return `Sign In Time: ${this.formatTime(
        this.currentAttendanceStatus.sign_in_time
      )}`;
    }

    if (
      this.currentAttendanceStatus.sign_in_time &&
      this.currentAttendanceStatus.sign_out_time
    ) {
      return `Sign Out Time: ${this.formatTime(
        this.currentAttendanceStatus.sign_out_time
      )}`;
    }

    return null;
  }

  formatTime(time: string): string {
    const date = new Date(time);
    const bangladeshTime = new Date(
      date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
    );
    return bangladeshTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}
