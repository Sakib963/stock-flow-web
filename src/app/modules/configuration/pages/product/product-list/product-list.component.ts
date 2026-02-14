import { CommonModule } from '@angular/common';
import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { TableConfig } from '@app/core/interfaces/table';
import { HttpService } from '@app/core/services/http.service';
import { PRODUCT_TABLE_CONFIG } from '@app/modules/configuration/config/product.table.config';
import { AdaptiveListComponent } from '@app/shared/components/adaptive-list/adaptive-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'product-list',
  imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, PageHeaderComponent, AdaptiveListComponent, LoaderComponent],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent {
  productTableConfig: TableConfig = PRODUCT_TABLE_CONFIG;
  data: any[] = [];
  totalCount: number = 0;
  pageLoading: boolean = false; // Initial page load
  tableLoading: boolean = false; // Table data/filter loading
  payload: any = {
    offset: 0,
    limit: Constants.PAGE_SIZE,
    search_text: '',
    status: '',
    category_oid: '',
    sub_category_oid: '',
    brand_oid: '',
  };
  searchControl: FormControl = new FormControl('');

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _modalService: NzModalService
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
      category_oid: '',
      sub_category_oid: '',
      brand_oid: '',
    };
    this.loadList(true); // Pass true to indicate it's a filter/refresh
  }

  handlePaginationEvent(event: any) {
    this.payload = {
      ...this.payload,
      offset: event.offset,
      limit: event.limit,
    };
    this.loadList(true); // Pass true for pagination loading
  }

  loadList(isRefresh: boolean = false): any {
    // Set appropriate loading state
    if (isRefresh) {
      this.tableLoading = true;
    } else {
      this.pageLoading = true;
    }

    this._httpService
      .get(APIEndpoint.GET_PRODUCT_LIST, this.payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => {
          this.pageLoading = false;
          this.tableLoading = false;
        })
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
      this.handleAddProduct();
    } else if (event.action === 'view') {
      this.handleViewProduct(event.value.oid);
    } else if (event.action === 'edit') {
      this.handleEditProduct(event.value.oid);
    } else if (event.action === 'delete') {
      this.handleDeleteProduct(event.value.oid);
    }
  }

  handleAddProduct(): any {
    this._router.navigate(['../create'], {
      relativeTo: this._activatedRoute,
    });
  }

  handleViewProduct(value: any): any {
    this._router.navigate([`../view/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handleEditProduct(value: any): any {
    this._router.navigate([`../view/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: true },
    });
  }

  handleDeleteProduct(oid: string): void {
    this._modalService.create({
      nzContent: ConfirmationModalComponent,
      nzData: {
        message: 'Are you sure you want to delete this product?',
      },
      nzFooter: null,
      nzClosable: false,
      nzOnOk: () => this.deleteProduct(oid),
    });
  }

  deleteProduct(oid: string): void {
    this.tableLoading = true;
    this._httpService
      .get(APIEndpoint.DELETE_PRODUCT, { oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.tableLoading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this._notificationService.success('Success!', 'Product deleted successfully.');
            this.loadList(true);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
