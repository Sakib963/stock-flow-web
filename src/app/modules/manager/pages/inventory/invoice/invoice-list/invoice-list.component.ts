import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ViewPurchaseOrderListComponent } from '@app/modules/manager/components/inventory/purchase-order/view-purchase-order-list/view-purchase-order-list.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { ViewInvoiceListComponent } from '@app/modules/manager/components/inventory/invoice/view-invoice-list/view-invoice-list.component';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    ViewInvoiceListComponent,
  ],
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.scss'],
})
export class InvoiceListComponent implements OnInit {
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
  dateControl: FormControl = new FormControl(null);
  statusControl: FormControl = new FormControl(null);

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.constructDefaultPayload();
    this.loadList();
    this.dateControl.valueChanges.subscribe((value) => {
      this.onDateChange(value);
    });
    this.statusControl.valueChanges.subscribe((value) => {
      this.onStatusChange(value);
    });
    this.searchControl.valueChanges.subscribe((value) => {
      this.onSearchChange(value);
    });
  }

  constructDefaultPayload(): void {
    const currentDate = new Date().toISOString().split('T')[0];
    this.dateControl.setValue(currentDate);
    // this.statusControl.setValue('Draft');
    this.payload.selected_date = currentDate;
    // this.payload.status = 'Draft';
  }

  onDateChange(value: string): void {
    if (value) {
    this.payload = { ...this.payload, offset: 0, limit: Constants.PAGE_SIZE, selected_date: value};
      this.isFilter = true;
    } else {
      this.payload = { ...this.payload, offset: 0, limit: Constants.PAGE_SIZE, selected_date: null};
    }
    this.loadList();
  }

  onSearchChange(value: string): void {
    this.payload = { ...this.payload, offset: 0, limit: Constants.PAGE_SIZE, search_text: value, status: '' };
    this.isFilter = true;
    this.loadList();
  }

  onStatusChange(value: string): void {
    this.payload = { ...this.payload, offset: 0, limit: Constants.PAGE_SIZE, search_text: '', status: value};
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
      .get(APIEndpoint.GET_INVOICE_LIST_FOR_MANAGER, this.payload)
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
    if (event.action === 'view') {
      this.handleView(event.value.oid);
    } else if (event.action === 'print') {
      this.handlePrint(event.value.oid);
    }
  }

  handleView(value: any): any {
    this._router.navigate([`../view-invoice/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handlePrint(value: any): any {
    // todo!: Implement print functionality
    this._notificationService.warning(
      'Warning!',
      'Print functionality is not implemented yet.'
    );
  }
}
