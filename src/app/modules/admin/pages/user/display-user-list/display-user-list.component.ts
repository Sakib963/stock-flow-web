import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Constants } from '@app/core/constants/constants';
import { ActivatedRoute, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ViewUserListComponent } from '@app/modules/admin/components/user/view-user-list/view-user-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-display-user-list',
  standalone: true,
  imports: [
    CommonModule,
    ViewUserListComponent,
    LoaderComponent,
    NgZorroCustomModule,
    ReactiveFormsModule,
  ],
  templateUrl: './display-user-list.component.html',
  styleUrls: ['./display-user-list.component.scss'],
})
export class DisplayUserListComponent implements OnInit {
  data: any[] = [];
  loading: boolean = false;
  payload: any = { offset: 0, limit: Constants.PAGE_SIZE, search_text: '' };
  isFilter: boolean = false;
  searchControl: FormControl = new FormControl('');

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadUserList();
    this.searchControl.valueChanges.subscribe((value) => {
      this.onSearchChange(value);
    });
  }

  onSearchChange(value: string): void {
    this.payload.search_text = value;
    this.isFilter = true;
    this.loadUserList();
  }

  loadUserList(): any {
    if (!this.isFilter) {
      this.loading = true;
    }
    this._httpService
      .get(APIEndpoint.GET_USER_LIST, this.payload)
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
            } else {
              this.data = [];
            }
          }
        },
        error: (err: any) => {
          this._notificationService.error('Error!', 'Something Went Wrong!');
        },
      });
  }

  handleListActions(event: any): any {
    if (event.action === 'create') {
      this.handleAddUser();
    }
  }

  handleAddUser(): any {
    this._router.navigate(['../create-user'], {
      relativeTo: this._activatedRoute,
    });
  }
}
