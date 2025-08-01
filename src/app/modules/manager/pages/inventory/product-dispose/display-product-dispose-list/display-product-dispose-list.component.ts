import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PrimaryButtonWithPlusIcon } from '@app/shared/components/buttons/primary-button-with-plus-icon/primary-button-with-plus-icon.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { ViewProductDisposeListComponent } from '@app/modules/manager/components/inventory/product-dispose/view-product-dispose-list/view-product-dispose-list.component';

@Component({
  selector: 'display-product-dispose-list',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    ViewProductDisposeListComponent,
    PrimaryButtonWithPlusIcon,
  ],
  templateUrl: './display-product-dispose-list.component.html',
  styleUrls: ['./display-product-dispose-list.component.scss'],
})
export class DisplayProductDisposeListComponent implements OnInit {
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
  selectControl: FormControl = new FormControl('');
  options = [
    { value: 'paid', label: 'Paid' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partially_paid', label: 'Partially Paid' },
  ];

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
    this.selectControl.valueChanges.subscribe((value) => {
      this.onSelectChange(value);
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

  onSelectChange(value: string): void {
    if (value)
      this.payload = {
        ...this.payload,
        offset: 0,
        limit: Constants.PAGE_SIZE,
        status: value,
      };
    else
      this.payload = {
        ...this.payload,
        offset: 0,
        limit: Constants.PAGE_SIZE,
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
      .get(APIEndpoint.GET_PRODUCT_DISPOSE_LIST, this.payload)
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
      this.handleAdd();
    } else if (event.action === 'view') {
      this.handleView(event.value.oid);
    } else if (event.action === 'edit') {
      this.handleEdit(event.value.oid);
    }
  }

  handleAdd(): any {
    this._router.navigate(['../create-product-dispose'], {
      relativeTo: this._activatedRoute,
    });
  }

  handleView(value: any): any {
    this._router.navigate([`../view-product-dispose/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handleEdit(value: any): any {
    this._router.navigate([`../view-product-dispose/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: true },
    });
  }
}
