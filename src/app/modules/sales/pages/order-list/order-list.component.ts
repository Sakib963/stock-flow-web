import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { isMultiChannel, isOnlineEnabled, isPosEnabled } from '@app/core/constants/company-info';
import { TableConfig } from '@app/core/interfaces/table';
import { HttpService } from '@app/core/services/http.service';
import { ORDER_TABLE_CONFIG } from '@app/modules/sales/config/order.table.config';
import { AdaptiveListComponent } from '@app/shared/components/adaptive-list/adaptive-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';

@Component({
    selector: 'order-list',
    imports: [CommonModule, NgZorroCustomModule, FormsModule, ReactiveFormsModule, PageHeaderComponent, AdaptiveListComponent, LoaderComponent],
    templateUrl: './order-list.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './order-list.component.scss',
})
export class OrderListComponent {
    orderTableConfig: TableConfig = ORDER_TABLE_CONFIG;
    data: any[] = [];
    totalCount = 0;
    pageLoading = false;
    tableLoading = false;
    payload: any = { offset: 0, limit: Constants.PAGE_SIZE, search_text: '', channel: '', status: '' };
    searchControl = new FormControl('');

    // Channel handling depends on the shop's order system (company-info).
    showPos = isPosEnabled();
    showOnline = isOnlineEnabled();
    showChannelFilter = isMultiChannel();

    channelOptions = [
        { label: 'All channels', value: '' },
        { label: 'POS', value: 'POS' },
        { label: 'Online', value: 'ONLINE' },
    ];
    statusOptions = [
        { label: 'All statuses', value: '' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Confirmed', value: 'Confirmed' },
        { label: 'Purchased (POS)', value: 'Purchased' },
        { label: 'Delivered', value: 'Delivered' },
        { label: 'Partially Returned', value: 'PartiallyReturned' },
        { label: 'Returned', value: 'Returned' },
        { label: 'Cancelled', value: 'Cancelled' },
    ];

    constructor(
        private _httpService: HttpService,
        private _destroyRef: DestroyRef,
        private _notificationService: NzNotificationService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute
    ) {}

    ngOnInit(): void {
        // Single-channel shops: scope the list to that channel and drop the channel column.
        if (!this.showChannelFilter) {
            this.payload.channel = this.showPos ? 'POS' : 'ONLINE';
        }
        this.orderTableConfig = this.buildTableConfig();
        this.loadList();
        this.searchControl.valueChanges
            .pipe(
                map((v: string | null) => (v || '').trim()),
                debounceTime(300),
                distinctUntilChanged(),
                takeUntilDestroyed(this._destroyRef)
            )
            .subscribe((v) => {
                this.payload = { ...this.payload, offset: 0, search_text: v };
                this.loadList(true);
            });
    }

    // Build the table config for this shop: drop the Channel column when single-channel,
    // and point the empty-state "add" button at whichever intake channel is enabled.
    private buildTableConfig(): TableConfig {
        const cfg: TableConfig = { ...ORDER_TABLE_CONFIG, columns: [...ORDER_TABLE_CONFIG.columns] };
        if (!this.showChannelFilter) {
            cfg.columns = cfg.columns.filter((c) => c.source !== 'channel');
        }
        if (!this.showOnline && cfg.noData) {
            cfg.noData = { ...cfg.noData, message: 'No orders yet. Create a POS sale to get started.', addButtonText: 'New POS Sale', addButtonUrl: '/sales/pos' };
        }
        return cfg;
    }

    onFilterChange(): void {
        this.payload = { ...this.payload, offset: 0 };
        this.loadList(true);
    }

    handlePaginationEvent(event: any) {
        this.payload = { ...this.payload, offset: event.offset, limit: event.limit };
        this.loadList(true);
    }

    loadList(isRefresh = false): void {
        if (isRefresh) this.tableLoading = true;
        else this.pageLoading = true;

        this._httpService
            .get(APIEndpoint.ORDER_LIST, this.payload)
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
                        this.data = res.body?.data?.length ? res.body.data : [];
                        this.totalCount = res.body?.total || 0;
                    }
                },
                error: (err: any) => this._notificationService.error('Error!', err?.error?.message),
            });
    }

    handleListActions(event: any): void {
        if (event.action === 'view') {
            this._router.navigate([`../view/${event.value.oid}`], { relativeTo: this._activatedRoute });
        }
    }

    goToPos(): void {
        this._router.navigate(['/sales/pos']);
    }
    goToOnline(): void {
        this._router.navigate(['/sales/online']);
    }
}
