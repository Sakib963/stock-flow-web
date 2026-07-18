import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { TableConfig } from '@app/core/interfaces/table';
import { HttpService } from '@app/core/services/http.service';
import { PRODUCT_DISPOSE_TABLE_CONFIG } from '@app/modules/inventory/config/product-dispose.table.config';
import { AdaptiveListComponent } from '@app/shared/components/adaptive-list/adaptive-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, debounceTime, distinctUntilChanged, finalize } from 'rxjs';

@Component({
    selector: 'product-dispose-list',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, PageHeaderComponent, AdaptiveListComponent, LoaderComponent],
    templateUrl: './product-dispose-list.component.html',
    styleUrl: './product-dispose-list.component.scss',
})
export class ProductDisposeListComponent implements OnInit {
    disposeTableConfig: TableConfig = PRODUCT_DISPOSE_TABLE_CONFIG;
    data: any[] = [];
    totalCount: number = 0;
    pageLoading: boolean = false;
    tableLoading: boolean = false;
    payload: any = {
        offset: 0,
        limit: Constants.PAGE_SIZE,
        search_text: '',
        status: '',
    };
    searchControl: FormControl = new FormControl('');
    statusControl: FormControl = new FormControl('');

    statusList: any[] = [
        { label: 'Submitted', value: 'Submitted' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Rejected', value: 'Rejected' },
        { label: 'Cancelled', value: 'Cancelled' },
        { label: 'Reversed', value: 'Reversed' },
    ];

    private readonly DISPOSAL_METHOD_LABEL_MAP: any = DROPDOWN_OPTIONS.DISPOSAL_METHODS.reduce((acc: any, method: any) => {
        acc[method.value] = method.label;
        return acc;
    }, {});

    transformDispose = (row: any) => ({
        ...row,
        disposal_method: this.DISPOSAL_METHOD_LABEL_MAP[row.disposal_method] || row.disposal_method || '-',
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
            this.onStatusChange(value || '');
        });
    }

    onSearchChange(value: string): void {
        this.payload = { ...this.payload, offset: 0, search_text: value };
        this.loadList(true);
    }

    onStatusChange(value: string): void {
        this.payload = { ...this.payload, offset: 0, status: value };
        this.loadList(true);
    }

    handlePaginationEvent(event: any) {
        this.payload = { ...this.payload, offset: event.offset, limit: event.limit };
        this.loadList(true);
    }

    loadList(isRefresh: boolean = false): any {
        if (isRefresh) {
            this.tableLoading = true;
        } else {
            this.pageLoading = true;
        }

        this._httpService
            .get(APIEndpoint.GET_PRODUCT_DISPOSE_LIST, this.payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                map((res: any) => {
                    if (res.status !== 200) return res;
                    return {
                        ...res,
                        body: {
                            ...res.body,
                            data: (res.body?.data || []).map(this.transformDispose),
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
                    this._notificationService.error('Error!', err?.error?.message);
                },
            });
    }

    handleListActions(event: any): any {
        if (event.action === 'create') {
            this.handleAddDispose();
        } else if (event.action === 'view') {
            this.handleViewDispose(event.value.oid);
        } else if (event.action === 'edit') {
            this.handleEditDispose(event.value.oid, event.value.status);
        }
    }

    handleAddDispose(): any {
        this._router.navigate(['../create'], { relativeTo: this._activatedRoute });
    }

    handleViewDispose(value: any): any {
        this._router.navigate([`../${value}`], {
            relativeTo: this._activatedRoute,
            state: { edit: false },
        });
    }

    handleEditDispose(value: any, status: string): any {
        if (status !== 'Submitted') {
            this._notificationService.warning('Product Dispose', 'Only submitted disposals can be edited.');
            return;
        }

        this._router.navigate([`../${value}`], {
            relativeTo: this._activatedRoute,
            state: { edit: true },
        });
    }
}
