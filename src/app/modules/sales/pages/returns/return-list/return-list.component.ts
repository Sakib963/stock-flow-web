import { CommonModule } from '@angular/common';
import { Component, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { isMultiChannel } from '@app/core/constants/company-info';
import { Constants } from '@app/core/constants/constants';
import { TableConfig } from '@app/core/interfaces/table';
import { RETURN_CHANNEL_COLUMN, RETURN_TABLE_CONFIG } from '@app/modules/sales/config/return.table.config';
import { SalesService } from '@app/modules/sales/services/sales.service';
import { AdaptiveListComponent } from '@app/shared/components/adaptive-list/adaptive-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';

@Component({
    selector: 'return-list',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, AdaptiveListComponent, LoaderComponent],
    templateUrl: './return-list.component.html',
    styleUrl: './return-list.component.scss',
})
export class ReturnListComponent {
    returnTableConfig: TableConfig = RETURN_TABLE_CONFIG;
    data: any[] = [];
    totalCount: number = 0;
    pageLoading: boolean = false; // Initial page load
    tableLoading: boolean = false; // Table data/filter loading
    payload: any = {
        offset: 0,
        limit: Constants.PAGE_SIZE,
        search_text: '',
        status: '',
        channel: '',
    };
    searchControl: FormControl = new FormControl('');

    // KPI strip. `pendingCount` leads because it is the only figure that asks
    // someone to do something: those returns have not moved stock yet.
    kpis = signal<any>(null);

    statusOptions = ['Pending', 'Returned', 'Completed', 'Cancelled'];
    isMultiChannel = isMultiChannel();

    constructor(
        private _salesService: SalesService,
        private _destroyRef: DestroyRef,
        private _notificationService: NzNotificationService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute
    ) {}

    ngOnInit(): void {
        // Single-channel shops have nothing to disambiguate, so the column only
        // appears when the shop actually runs both channels.
        if (this.isMultiChannel) {
            const columns = [...RETURN_TABLE_CONFIG.columns];
            columns.splice(3, 0, RETURN_CHANNEL_COLUMN as any);
            this.returnTableConfig = { ...RETURN_TABLE_CONFIG, columns };
        }

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

    onChannelChange(channel: string | null): void {
        this.payload = { ...this.payload, offset: 0, channel: channel || '' };
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

        this._salesService
            .getList$(APIEndpoint.GET_RETURN_LIST, this.payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.pageLoading = false;
                    this.tableLoading = false;
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this.data = res.body?.data?.length ? res.body.data : [];
                        this.totalCount = res.body?.data?.length ? res.body.total : 0;
                    }
                },
                error: (err: any) => {
                    this._notificationService.error('Error!', err?.error?.message);
                },
            });
    }

    loadKpis(): void {
        this._salesService
            .getList$(APIEndpoint.GET_RETURN_LIST_KPIS)
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
        if (event.action === 'view') {
            this._router.navigate([`../view/${event.value.oid}`], { relativeTo: this._activatedRoute });
        } else if (event.action === 'create') {
            // The empty state points at Orders: a return always starts there.
            this._router.navigate(['/sales/orders/list']);
        }
    }
}
