import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { TableConfig } from '@app/core/interfaces/table';
import { HttpService } from '@app/core/services/http.service';
import { INVENTORY_OVERVIEW_TABLE_CONFIG } from '@app/modules/inventory/config/inventory-overview.table.config';
import { AdaptiveListComponent } from '@app/shared/components/adaptive-list/adaptive-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';

@Component({
    selector: 'inventory-overview-list',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, PageHeaderComponent, AdaptiveListComponent, LoaderComponent],
    templateUrl: './overview-list.component.html',
    styleUrl: './overview-list.component.scss',
})
export class OverviewListComponent implements OnInit {
    tableConfig: TableConfig = INVENTORY_OVERVIEW_TABLE_CONFIG;
    data: any[] = [];
    totalCount = 0;
    pageLoading = false;
    tableLoading = false;

    payload: any = {
        offset: 0,
        limit: Constants.PAGE_SIZE,
        search_text: '',
        status: '',
        category_oid: '',
        sub_category_oid: '',
        brand_oid: '',
    };

    searchControl = new FormControl('');
    categoryControl = new FormControl<string | null>(null);
    subCategoryControl = new FormControl<string | null>(null);
    brandControl = new FormControl<string | null>(null);
    statusControl = new FormControl<string | null>(null);

    categoryList: any[] = [];
    categoryLoading = signal(false);
    subCategoryList: any[] = [];
    subCategoryLoading = signal(false);
    brandList: any[] = [];
    brandLoading = signal(false);
    statusList = [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
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
        this.loadCategoryList();
        this.loadBrandList();

        this.searchControl.valueChanges
            .pipe(
                map((v) => (v || '').trim()),
                debounceTime(300),
                distinctUntilChanged(),
                takeUntilDestroyed(this._destroyRef)
            )
            .subscribe((value) => this.applyFilter({ search_text: value }));

        this.categoryControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this._destroyRef)).subscribe((value) => this.onCategoryChange(value));

        this.subCategoryControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this._destroyRef)).subscribe((value) => this.applyFilter({ sub_category_oid: value || '' }));

        this.brandControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this._destroyRef)).subscribe((value) => this.applyFilter({ brand_oid: value || '' }));

        this.statusControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this._destroyRef)).subscribe((value) => this.applyFilter({ status: value || '' }));
    }

    private applyFilter(changes: Partial<typeof this.payload>): void {
        this.payload = { ...this.payload, ...changes, offset: 0 };
        this.loadList(true);
    }

    private onCategoryChange(value: string | null): void {
        this.subCategoryControl.setValue(null, { emitEvent: false });
        this.subCategoryList = [];

        if (value) {
            this.subCategoryControl.enable({ emitEvent: false });
            this.loadSubCategoryList(value);
        } else {
            this.subCategoryControl.disable({ emitEvent: false });
        }

        this.applyFilter({ category_oid: value || '', sub_category_oid: '' });
    }

    handlePaginationEvent(event: any): void {
        this.payload = { ...this.payload, offset: event.offset, limit: event.limit };
        this.loadList(true);
    }

    loadList(isRefresh = false): void {
        if (isRefresh) {
            this.tableLoading = true;
        } else {
            this.pageLoading = true;
        }

        this._httpService
            .get(APIEndpoint.GET_INVENTORY_OVERVIEW_PRODUCT_LIST, this.payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                map((res: any) => {
                    if (res.status !== 200) return res;
                    return {
                        ...res,
                        body: {
                            ...res.body,
                            data: (res.body?.data || []).map(this.transformProduct),
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
                        this.data = res.body?.data?.length ? res.body.data : [];
                        this.totalCount = res.body?.total || 0;
                    }
                },
                error: (err: any) => {
                    this._notificationService.error('Error', err?.error?.message || 'Failed to load inventory overview');
                },
            });
    }

    handleListActions(event: any): void {
        if (event.action === 'view') {
            this._router.navigate([`../${event.value.product_oid}`], {
                relativeTo: this._activatedRoute,
            });
        }
    }

    resetFilters(): void {
        this.searchControl.setValue('', { emitEvent: false });
        this.categoryControl.setValue(null, { emitEvent: false });
        this.subCategoryControl.setValue(null, { emitEvent: false });
        this.subCategoryControl.disable({ emitEvent: false });
        this.brandControl.setValue(null, { emitEvent: false });
        this.statusControl.setValue(null, { emitEvent: false });
        this.subCategoryList = [];
        this.payload = { offset: 0, limit: Constants.PAGE_SIZE, search_text: '', status: '', category_oid: '', sub_category_oid: '', brand_oid: '' };
        this.loadList();
    }

    private transformProduct = (row: any) => ({
        ...row,
        inventory_status: this.resolveInventoryStatus(row),
        stock_alert: row.total_available_quantity < row.restock_threshold ? 'Low Stock' : 'OK',
    });

    private resolveInventoryStatus(row: any): string {
        if (!row.has_for_sale_batch) return 'Internal Use';
        if (row.has_pending_pricing) return 'Pending Pricing';
        return 'Ready for Sale';
    }

    private loadCategoryList(): void {
        this._httpService
            .get(APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) this.categoryList = res.body?.data || [];
                },
                error: () => {},
            });
    }

    private loadSubCategoryList(categoryOid: string): void {
        this._httpService
            .get(APIEndpoint.GET_SUB_CATEGORY_LIST_FOR_DROPDOWN, { category_oid: categoryOid })
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) this.subCategoryList = res.body?.data || [];
                },
                error: () => {},
            });
    }

    private loadBrandList(): void {
        this._httpService
            .get(APIEndpoint.GET_BRAND_LIST_FOR_DROPDOWN)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) this.brandList = res.body?.data || [];
                },
                error: () => {},
            });
    }
}
