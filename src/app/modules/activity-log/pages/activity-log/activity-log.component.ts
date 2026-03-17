import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
import { AdaptiveListComponent } from '@app/shared/components/adaptive-list/adaptive-list.component';
import { TableConfig } from '@app/core/interfaces/table';
import { ACTIVITY_LOG_TABLE_CONFIG } from '../../config/activity-log.table.config';

interface ActivityLogItem {
    oid: string;
    feature_key: string;
    feature_label: string;
    title: string;
    description: string;
    performed_by: string;
    performed_on: string;
    performed_on_display: string;
}

@Component({
    selector: 'app-activity-log',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgZorroCustomModule, PageHeaderComponent, LoaderComponent, AdaptiveListComponent],
    templateUrl: './activity-log.component.html',
    styleUrl: './activity-log.component.scss',
})
export class ActivityLogComponent implements OnInit {
    activityLogTableConfig: TableConfig = ACTIVITY_LOG_TABLE_CONFIG;
    data: ActivityLogItem[] = [];
    totalCount = 0;

    pageLoading = false;
    tableLoading = false;

    payload: any = {
        offset: 0,
        limit: 20,
        search_text: '',
        feature_key: '',
        date_from: '',
        date_to: '',
    };

    searchControl: FormControl = new FormControl('');
    selectedFeature = '';
    dateRange: Date[] | null = null;

    breadcrumbs = [
        { label: 'Home', url: '/', icon: 'home' },
        { label: 'Activity Log', url: '/activity_log' },
    ];

    featureOptions = [
        { label: 'All Features', value: '' },
        { label: 'Category', value: 'category' },
        { label: 'Sub Category', value: 'sub-category' },
        { label: 'Brands', value: 'brand' },
        { label: 'Supplier', value: 'supplier' },
        { label: 'Product', value: 'product' },
        { label: 'Warehouse', value: 'warehouse' },
        { label: 'Aisle/Zone', value: 'aisle' },
        { label: 'Purchase Order', value: 'purchase-order' },
        { label: 'Product Return', value: 'product-return' },
        { label: 'Dispose', value: 'dispose' },
        { label: 'Invoice', value: 'invoice' },
        { label: 'Attendance', value: 'attendance' },
    ];

    constructor(
        private _httpService: HttpService,
        private _destroyRef: DestroyRef,
        private _notificationService: NzNotificationService
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
            .subscribe((value: string) => {
                this.payload = {
                    ...this.payload,
                    offset: 0,
                    search_text: value,
                };
                this.loadList(true);
            });
    }

    onFeatureChange(value: string): void {
        this.selectedFeature = value;
        this.payload = {
            ...this.payload,
            offset: 0,
            feature_key: value || '',
        };
        this.loadList(true);
    }

    onDateRangeChange(value: Date[] | null): void {
        this.dateRange = value;

        const dateFrom = value?.[0] ? this.formatDate(value[0]) : '';
        const dateTo = value?.[1] ? this.formatDate(value[1]) : '';

        this.payload = {
            ...this.payload,
            offset: 0,
            date_from: dateFrom,
            date_to: dateTo,
        };

        this.loadList(true);
    }

    onPageIndexChange(pageIndex: number): void {
        const offset = (pageIndex - 1) * this.payload.limit;
        this.payload = {
            ...this.payload,
            offset,
        };

        this.loadList(true);
    }

    onPageSizeChange(limit: number): void {
        this.payload = {
            ...this.payload,
            offset: 0,
            limit,
        };

        this.loadList(true);
    }

    refreshList(): void {
        this.loadList(true);
    }

    private loadList(isRefresh: boolean = false): void {
        if (isRefresh) {
            this.tableLoading = true;
        } else {
            this.pageLoading = true;
        }

        this._httpService
            .post(APIEndpoint.GET_ACTIVITY_LOG_LIST, this.payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.pageLoading = false;
                    this.tableLoading = false;
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.status === 200 && res?.body?.code === 200) {
                        const list = res.body?.data || [];
                        this.data = list.map((item: ActivityLogItem) => ({
                            ...item,
                            performed_on_display: this.formatDateTime(item.performed_on),
                        }));
                        this.totalCount = res.body?.total || 0;
                        return;
                    }

                    this.data = [];
                    this.totalCount = 0;
                },
                error: (err: any) => {
                    this._notificationService.error('Activity Log', err?.error?.message || 'Failed to load activity logs');
                    this.data = [];
                    this.totalCount = 0;
                },
            });
    }

    handlePaginationEvent(event: { offset: number; limit: number }): void {
        this.payload = {
            ...this.payload,
            offset: event.offset,
            limit: event.limit,
        };

        this.loadList(true);
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    private formatDateTime(value: string): string {
        if (!value) {
            return '-';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '-';
        }

        return date.toLocaleString();
    }
}
