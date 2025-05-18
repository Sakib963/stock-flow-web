import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { ViewEmployeeAttendanceListComponent } from '@app/modules/manager/components/employee/attendance/view-employee-attendance-list/view-employee-attendance-list.component';

@Component({
  selector: 'app-display-employee-attendance-list',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    ViewEmployeeAttendanceListComponent,
  ],
  templateUrl: './display-employee-attendance-list.component.html',
  styleUrls: ['./display-employee-attendance-list.component.scss'],
})
export class DisplayEmployeeAttendanceListComponent {
  data: any[] = [];
  totalCount: number = 0;
  loading: boolean = false;
  payload: any = {
    offset: 0,
    limit: Constants.PAGE_SIZE,
    search_text: '',
    month: '',
  };
  isFilter: boolean = false;
  dateControl: FormControl = new FormControl('');

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
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

  loadList(): any {
    if (!this.isFilter) {
      this.loading = true;
    }
    this._httpService
      .get(APIEndpoint.GET_EMPLOYEE_ATTENDANCE_LIST, this.payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
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
            console.log(this.data);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  handleListActions(event: any): any {
    if (event.action === 'create') {
      this.handleAdd();
    } else if (event.action === 'view') {
      this.handleView(event.value.oid);
    } else if (event.action === 'edit') {
      this.handleEdit(event.value.oid);
    }
  }

  handleAdd(): any {
    this._router.navigate(['../create-attendance'], {
      relativeTo: this._activatedRoute,
    });
  }

  handleView(value: any): any {
    this._router.navigate([`../view-attendance-details/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handleEdit(value: any): any {
    this._router.navigate([`../view-attendance-details/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: true },
    });
  }
}
