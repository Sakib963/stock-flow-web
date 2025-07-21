import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { ViewInvoiceListComponent } from '@app/modules/sales/components/invoice/view-invoice-list/view-invoice-list.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { PrintService } from '@app/core/services/print.service';

@Component({
  selector: 'app-display-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    ViewInvoiceListComponent,
  ],
  templateUrl: './display-invoice-list.component.html',
  styleUrls: ['./display-invoice-list.component.scss'],
})
export class DisplayInvoiceListComponent implements OnInit {
  data: any[] = [];
  totalCount: number = 0;
  loading: boolean = false;
  payload: any = {
    offset: 0,
    limit: Constants.PAGE_SIZE,
    selected_date: '',
    status: '',
  };
  isFilter: boolean = false;
  dateControl: FormControl = new FormControl(null);
  statusControl: FormControl = new FormControl(null);

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _modal: NzModalService,
    private _printService: PrintService
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
  }

  constructDefaultPayload(): void {
    const currentDate = new Date().toISOString().split('T')[0];
    this.dateControl.setValue(currentDate);
    // this.statusControl.setValue('Draft');
    this.payload.selected_date = currentDate;
    // this.payload.status = 'Draft';
  }

  onDateChange(value: string): void {
    this.payload.selected_date = value;
    this.isFilter = true;
    this.loadList();
  }

  onStatusChange(value: string): void {
    this.payload.status = value;
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
      .get(APIEndpoint.GET_INVOICE_LIST, this.payload)
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
    if (event.action === 'delete') {
      this.handleDelete(event.value.oid);
    } else if (event.action === 'edit') {
      this.handleEdit(event.value.oid);
    } else if (event.action === 'print') {
      this.handlePrint(event.value.oid);
    } else if (event.action === 'view') {
      this.handleView(event.value.oid);
    }
  }

  handleDelete(value: any): any {
    this.handleDeleteConfirm(value);
  }

  handleDeleteConfirm(value: any): void {
    let message = 'Do you want to delete this invoice?';
    this._modal.create({
      nzContent: ConfirmationModalComponent,
      nzData: {
        message,
      },
      nzFooter: null,
      nzClosable: false,
      nzOnOk: () => this.deleteInvoice(value),
    });
  }

  deleteInvoice(oid: any): void {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.DELETE_INVOICE, { oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this._notificationService.success('Success!', res.body.message);
            this.loadList();
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  handleEdit(value: any): any {
    this._router.navigate(['/sales/quick-sale', value], {
      state: { edit: true },
    });
  }

  handleView(value: any): any {
    this._router.navigate([`../view-invoice/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handlePrint(value: any): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_INVOICE_DETAILS, { oid: value })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            const invoiceDetails = res.body.data;
            this._printService.printReceipt(invoiceDetails);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
