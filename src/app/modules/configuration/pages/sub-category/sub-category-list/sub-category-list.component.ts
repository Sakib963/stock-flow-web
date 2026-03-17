import { CommonModule } from '@angular/common';
import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { TableConfig } from '@app/core/interfaces/table';
import { HttpService } from '@app/core/services/http.service';
import { SUB_CATEGORY_TABLE_CONFIG } from '@app/modules/configuration/config/sub-category.table.config';
import { AdaptiveListComponent } from '@app/shared/components/adaptive-list/adaptive-list.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';

@Component({
    selector: 'sub-category-list',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, PageHeaderComponent, AdaptiveListComponent, LoaderComponent],
    templateUrl: './sub-category-list.component.html',
    styleUrl: './sub-category-list.component.scss',
})
export class SubCategoryListComponent {
    subCategoryTableConfig: TableConfig = SUB_CATEGORY_TABLE_CONFIG;
    data: any[] = [];
    totalCount: number = 0;
    pageLoading: boolean = false; // Initial page load
    tableLoading: boolean = false; // Table data/filter loading
    payload: any = {
        offset: 0,
        limit: Constants.PAGE_SIZE,
        search_text: '',
        status: '',
        category_oid: '',
    };
    searchControl: FormControl = new FormControl('');
    categoryControl: FormControl = new FormControl('');
    categoryList: any[] = [];

    constructor(
        private _httpService: HttpService,
        private _destroyRef: DestroyRef,
        private _notificationService: NzNotificationService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.loadList();
        this.loadCategoryDropdown();
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
        this.categoryControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this._destroyRef)).subscribe((value) => {
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
            category_oid: value,
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
            .get(APIEndpoint.GET_SUB_CATEGORY_LIST, this.payload)
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

    loadCategoryDropdown(): any {
        this._httpService
            .get(APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) {
                        this.categoryList = res.body?.data || [];
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
            this.handleAddSubCategory();
        } else if (event.action === 'view') {
            this.handleViewSubCategory(event.value.oid);
        } else if (event.action === 'edit') {
            this.handleEditSubCategory(event.value.oid);
        }
    }

    handleAddSubCategory(): any {
        this._router.navigate(['../create'], {
            relativeTo: this._activatedRoute,
        });
    }

    handleViewSubCategory(value: any): any {
        this._router.navigate([`../view/${value}`], {
            relativeTo: this._activatedRoute,
            state: { edit: false },
        });
    }

    handleEditSubCategory(value: any): any {
        this._router.navigate([`../view/${value}`], {
            relativeTo: this._activatedRoute,
            state: { edit: true },
        });
    }
}
