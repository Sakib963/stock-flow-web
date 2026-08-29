import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { TableConfig } from '@app/core/interfaces/table';
import { HttpService } from '@app/core/services/http.service';
import { PURCHASE_ORDER_TABLE_CONFIG } from '@app/modules/inventory/config/purchase-order.table.config';
import { AdaptiveListComponent } from '@app/shared/components/adaptive-list/adaptive-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, debounceTime, distinctUntilChanged, finalize } from 'rxjs';

@Component({
    selector: 'purchase-order-list',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, PageHeaderComponent, AdaptiveListComponent, LoaderComponent],
    templateUrl: './purchase-order-list.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './purchase-order-list.component.scss',
})
export class PurchaseOrderListComponent implements OnInit {
    categoryTableConfig: TableConfig = PURCHASE_ORDER_TABLE_CONFIG;
    data: any[] = [];
    totalCount: number = 0;
    pageLoading: boolean = false; // Initial page load
    tableLoading: boolean = false; // Table data/filter loading
    payload: any = {
        offset: 0,
        limit: Constants.PAGE_SIZE,
        search_text: '',
        status: '',
    };
    searchControl: FormControl = new FormControl('');
    statusControl: FormControl = new FormControl('');

    statusList: any[] = [
        // 'Submitted', 'Verified', 'Cancelled'
        { label: 'Submitted', value: 'Submitted' },
        { label: 'Verified', value: 'Verified' },
        { label: 'Cancelled', value: 'Cancelled' },
    ];

    PAYMENT_STATUS_LABEL_MAP: any = {
        paid: 'Paid',
        partially_paid: 'Partially Paid',
        unpaid: 'Unpaid',
    };

    PURCHASE_TYPE_LABEL_MAP: any = {
        instant: 'Instant',
        advance: 'Advance',
        overseas: 'Overseas',
    };

    transformPurchase = (row: any) => ({
        ...row,
        payment_status: this.PAYMENT_STATUS_LABEL_MAP[row.payment_status] || row.payment_status,
        purchase_type: this.PURCHASE_TYPE_LABEL_MAP[row.purchase_type] || row.purchase_type,
    });

    constructor(
        private _httpService: HttpService,
        private _destroyRef: DestroyRef,
        private _notificationService: NzNotificationService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.loadList();
        this.searchControl.valueChanges
            .pipe(
                map((value: string | null) => (value || '').trim()),
                debounceTime(300),
                distinctUntilChanged(),
                takeUntilDestroyed(this._destroyRef)
            )
            .subscribe((value) => {
                this.onSearchChange(value);
            });
        this.statusControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this._destroyRef)).subscribe((value) => {
            this.onCategoryChange(value || '');
        });
    }

    onSearchChange(value: string): void {
        this.payload = {
            ...this.payload,
            offset: 0,
            search_text: value,
        };
        this.loadList(true); // Pass true to indicate it's a filter/refresh
    }

    onCategoryChange(value: string): void {
        this.payload = {
            ...this.payload,
            offset: 0,
            status: value,
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
            .get(APIEndpoint.GET_PURCHASE_LIST, this.payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                map((res: any) => {
                    if (res.status !== 200) return res;

                    return {
                        ...res,
                        body: {
                            ...res.body,
                            data: (res.body?.data || []).map(this.transformPurchase),
                        },
                    };
                }),
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
            this.handleAddPurchaseOrder();
        } else if (event.action === 'view') {
            this.handleViewPurchaseOrder(event.value.oid);
        } else if (event.action === 'edit') {
            this.handleEditPurchaseOrder(event.value.oid, event.value.status);
        }
    }

    handleAddPurchaseOrder(): any {
        this._router.navigate(['../create'], {
            relativeTo: this._activatedRoute,
        });
    }

    handleViewPurchaseOrder(value: any): any {
        this._router.navigate([`../${value}`], {
            relativeTo: this._activatedRoute,
            state: { edit: false },
        });
    }

    handleEditPurchaseOrder(value: any, status: string): any {
        if (status !== 'Submitted') {
            this._notificationService.warning('Purchase Order', 'Only submitted purchase orders can be edited.');
            return;
        }

        this._router.navigate([`../${value}`], {
            relativeTo: this._activatedRoute,
            state: { edit: true },
        });
    }
}
