import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { TableConfig } from '@app/core/interfaces/table';
import { HttpService } from '@app/core/services/http.service';
import { WAREHOUSE_TABLE_CONFIG } from '@app/modules/configuration/config/warehouse.table.config';
import { AdaptiveListComponent } from '@app/shared/components/adaptive-list/adaptive-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';

@Component({
    selector: 'warehouse-list',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, PageHeaderComponent, AdaptiveListComponent, LoaderComponent],
    templateUrl: './warehouse-list.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './warehouse-list.component.scss',
})
export class WarehouseListComponent {
    warehouseTableConfig: TableConfig = WAREHOUSE_TABLE_CONFIG;
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

    private readonly _httpService = inject(HttpService);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _router = inject(Router);
    private readonly _activatedRoute = inject(ActivatedRoute);

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
    }

    onSearchChange(value: string): void {
        this.payload = {
            ...this.payload,
            offset: 0,
            search_text: value,
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
            .get(APIEndpoint.GET_WAREHOUSE_LIST, this.payload)
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
            this.handleAddWarehouse();
        } else if (event.action === 'view') {
            this.handleViewWarehouse(event.value.oid);
        } else if (event.action === 'edit') {
            this.handleEditWarehouse(event.value.oid);
        }
    }

    handleAddWarehouse(): any {
        this._router.navigate(['../create'], {
            relativeTo: this._activatedRoute,
        });
    }

    handleViewWarehouse(value: any): any {
        this._router.navigate([`../view/${value}`], {
            relativeTo: this._activatedRoute,
            state: { edit: false },
        });
    }

    handleEditWarehouse(value: any): any {
        this._router.navigate([`../view/${value}`], {
            relativeTo: this._activatedRoute,
            state: { edit: true },
        });
    }
}
