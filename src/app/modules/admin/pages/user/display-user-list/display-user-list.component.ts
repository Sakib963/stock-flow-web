import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Constants } from '@app/core/constants/constants';
import { Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ViewUserListComponent } from '@app/modules/admin/components/user/view-user-list/view-user-list.component';

@Component({
  selector: 'app-display-user-list',
  standalone: true,
  imports: [CommonModule, ViewUserListComponent],
  templateUrl: './display-user-list.component.html',
  styleUrls: ['./display-user-list.component.scss'],
})
export class DisplayUserListComponent implements OnInit {
  data: any[] = [];
  loading: boolean = false;
  payload: any = { offset: 0, limit: Constants.PAGE_SIZE, search_text: '' };
  isFilter: boolean = false;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserList();
  }

  loadUserList(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_USER_LIST, this.payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.data = res.body.data;
            console.log('Data fetched successfully:', this.data);
          }
        },
        error: (err: any) => {
          this._notificationService.error('Error!', 'Something Went Wrong!');
        },
      });
  }
}
