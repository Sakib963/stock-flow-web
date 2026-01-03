import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { HttpService } from '@app/core/services/http.service';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';

@Component({
  selector: 'category-list',
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PageHeaderComponent,
  ],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss',
})
export class CategoryListComponent implements OnInit {
  data: any[] = [];
  totalCount: number = 0;
  loading: boolean = false;
  payload: any = {
    offset: 0,
    limit: Constants.PAGE_SIZE,
    search_text: '',
    status: '',
  };
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
    this.loadList();
    this.searchControl.valueChanges.subscribe((value) => {
      this.onSearchChange(value);
    });
  }

  onSearchChange(value: string): void {
    this.payload = {
      offset: 0,
      limit: Constants.PAGE_SIZE,
      search_text: value,
      status: '',
    };
    this.isFilter = true;
    this.loadList();
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
      .get(APIEndpoint.GET_CATEGORY_LIST, this.payload)
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
      this.handleAddCategory();
    } else if (event.action === 'view') {
      this.handleViewCategory(event.value.oid);
    } else if (event.action === 'edit') {
      this.handleEditCategory(event.value.oid);
    }
  }

  handleAddCategory(): any {
    this._router.navigate(['../create'], {
      relativeTo: this._activatedRoute,
    });
  }

  handleViewCategory(value: any): any {
    this._router.navigate([`../view/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handleEditCategory(value: any): any {
    this._router.navigate([`../view/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: true },
    });
  }
}
