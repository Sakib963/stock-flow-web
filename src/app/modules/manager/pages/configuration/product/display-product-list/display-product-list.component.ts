import { Component, DestroyRef, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { debounceTime, distinctUntilChanged, finalize, take } from 'rxjs';
import { ViewProductListComponent } from '@app/modules/manager/components/configuration/product/view-product-list/view-product-list.component';
import { PrimaryButtonWithPlusIcon } from '@app/shared/components/buttons/primary-button-with-plus-icon/primary-button-with-plus-icon.component';

@Component({
  selector: 'app-display-product-list',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    ViewProductListComponent,
    PrimaryButtonWithPlusIcon,
  ],
  templateUrl: './display-product-list.component.html',
  styleUrls: ['./display-product-list.component.scss'],
})
export class DisplayProductListComponent implements OnInit {
  data: any[] = [];
  totalCount: number = 0;
  loading: boolean = false;
  payload: any = {
    offset: 0,
    limit: Constants.PAGE_SIZE,
    search_text: '',
    status: '',
    category_oid: '',
    sub_category_oid: '',
    brand_oid: '',
  };
  isFilter: boolean = false;
  filterForm!: FormGroup;
  previousCategory: any = null;

  categoryList: any[] = [];
  subCategoryList: any[] = [];
  brandList: any[] = [];
  statusList: any[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
  ];

  resetChildPageEvent: EventEmitter<void> = new EventEmitter();

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.filterForm = this._fb.group({
      search_text: [''],
      category_oid: [null],
      sub_category_oid: [null],
      brand_oid: [null],
      status: [null],
    });

    this.loadList();
    this.loadCategoryList();
    this.loadBrandList();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
        )
      )
      .subscribe((filters) => {
        // If category changed, reset subcategory
        if (filters.category_oid !== this.previousCategory) {
          this.filterForm.patchValue(
            { sub_category_oid: null },
            { emitEvent: false }
          );
          this.loadSubCategoryList(filters.category_oid);
          this.previousCategory = filters.category_oid;
        }

        this.payload = { ...this.payload, ...filters, offset: 0 };
        this.isFilter = true;
        this.loadList();
      });
  }

  resetFilters(): void {
    this.filterForm.reset(
      {
        search_text: '',
        category_oid: null,
        sub_category_oid: null,
        brand_oid: null,
        status: null,
      },
      { emitEvent: false }
    );

    this.subCategoryList = [];
    this.payload = { offset: 0, limit: Constants.PAGE_SIZE };
    this.loadList();

    this.resetChildPageEvent.emit();
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
      .get(APIEndpoint.GET_PRODUCT_LIST, this.payload)
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
    this._router.navigate(['../create-product'], {
      relativeTo: this._activatedRoute,
    });
  }

  handleView(value: any): any {
    this._router.navigate([`../view-product/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handleEdit(value: any): any {
    this._router.navigate([`../view-product/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: true },
    });
  }

  loadCategoryList(): any {
    this._httpService
      .get(APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.categoryList = [];
            if (res.body?.data?.length) {
              this.categoryList = res.body.data;
            } else {
              this.categoryList = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }

  loadSubCategoryList(category_oid: any): any {
    this._httpService
      .get(APIEndpoint.GET_SUB_CATEGORY_LIST_FOR_DROPDOWN, { category_oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.subCategoryList = [];
            if (res.body?.data?.length) {
              this.subCategoryList = res.body.data;
            } else {
              this.subCategoryList = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }

  loadBrandList(): any {
    this._httpService
      .get(APIEndpoint.GET_BRAND_LIST_FOR_DROPDOWN)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.brandList = [];
            if (res.body?.data?.length) {
              this.brandList = res.body.data;
            } else {
              this.brandList = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }
}
