import { CommonModule } from '@angular/common';
import { Component, DestroyRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { TableConfig } from '@app/core/interfaces/table';
import { HttpService } from '@app/core/services/http.service';
import { PRE_ORDER_TABLE_CONFIG } from '@app/modules/sales/config/pre-order.table.config';
import { AdaptiveListComponent } from '@app/shared/components/adaptive-list/adaptive-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';

@Component({
    selector: 'pre-order-list',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, AdaptiveListComponent, LoaderComponent],
    templateUrl: './pre-order-list.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './pre-order-list.component.scss',
})
export class PreOrderListComponent {
    preOrderTableConfig: TableConfig = PRE_ORDER_TABLE_CONFIG;
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

    // KPI strip. `advanceHeld` is money taken against bookings that are NOT sales
    // yet, so it is surfaced as a liability rather than folded into revenue.
    kpis = signal<any>(null);

    statusOptions = ['Pending', 'Confirmed', 'Converted', 'Cancelled'];

    constructor(
        private _httpService: HttpService,
        private _destroyRef: DestroyRef,
        private _notificationService: NzNotificationService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.loadList();
        this.loadKpis();

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
    }

    onSearchChange(value: string): void {
        this.payload = { ...this.payload, offset: 0, search_text: value };
        this.loadList(true);
    }

    onStatusChange(status: string | null): void {
        this.payload = { ...this.payload, offset: 0, status: status || '' };
        this.loadList(true);
    }

    handlePaginationEvent(event: any): void {
        this.payload = { ...this.payload, offset: event.offset, limit: event.limit };
        this.loadList(true);
    }

    loadList(isRefresh: boolean = false): void {
        if (isRefresh) {
            this.tableLoading = true;
        } else {
            this.pageLoading = true;
        }

        this._httpService
            .get(APIEndpoint.GET_PRE_ORDER_LIST, this.payload)
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
                            this.totalCount = 0;
                        }
                    }
                },
                error: (err: any) => {
                    this._notificationService.error('Error!', err?.error?.message);
                },
            });
    }

    loadKpis(): void {
        this._httpService
            .get(APIEndpoint.GET_PRE_ORDER_LIST_KPIS)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this.kpis.set(res.body.data);
                    }
                },
                error: () => {
                    // Non-fatal: the list is still usable without the KPI strip.
                    this.kpis.set(null);
                },
            });
    }

    handleListActions(event: any): void {
        if (event.action === 'create') {
            this.handleCreate();
        } else if (event.action === 'view') {
            this.handleView(event.value.oid);
        } else if (event.action === 'edit') {
            this.handleEdit(event.value.oid);
        }
    }

    handleCreate(): void {
        this._router.navigate(['../create'], { relativeTo: this._activatedRoute });
    }

    handleView(value: any): void {
        this._router.navigate([`../view/${value}`], { relativeTo: this._activatedRoute, state: { edit: false } });
    }

    handleEdit(value: any): void {
        this._router.navigate([`../view/${value}`], { relativeTo: this._activatedRoute, state: { edit: true } });
    }
}
