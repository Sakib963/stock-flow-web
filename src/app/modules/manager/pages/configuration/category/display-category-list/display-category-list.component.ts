import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { Constants } from '@app/core/constants/constants';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { ViewCategoryListComponent } from '@app/modules/manager/components/configuration/category/view-category-list/view-category-list.component';
import { PrimaryButtonWithPlusIcon } from '@app/shared/components/buttons/primary-button-with-plus-icon/primary-button-with-plus-icon.component';

@Component({
  selector: 'app-display-category-list',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    NgZorroCustomModule,
    ReactiveFormsModule,
    ViewCategoryListComponent,
    PrimaryButtonWithPlusIcon
  ],
  templateUrl: './display-category-list.component.html',
  styleUrls: ['./display-category-list.component.scss'],
})
export class DisplayCategoryListComponent implements OnInit {
  data: any[] = [];
  loading: boolean = false;
  payload: any = {
    offset: 0,
    limit: Constants.PAGE_SIZE,
    search_text: '',
    status: '',
  };
  isFilter: boolean = false;
  searchControl: FormControl = new FormControl('');

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadCategoryList();
    this.searchControl.valueChanges.subscribe((value) => {
      this.onSearchChange(value);
    });
  }

  onSearchChange(value: string): void {
    this.payload.search_text = value;
    this.isFilter = true;
    this.loadCategoryList();
  }

  loadCategoryList(): any {
    if (!this.isFilter) {
      this.loading = true;
    }
    this._httpService
      .get(APIEndpoint.GET_CATEGORY_LIST, this.payload)
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
      this.handleAddCategory();
    } else if (event.action === 'view') {
      this.handleViewCategory(event.value.oid);
    } else if (event.action === 'edit') {
      this.handleEditCategory(event.value.oid);
    }
  }

  handleAddCategory(): any {
    this._router.navigate(['../create-category'], {
      relativeTo: this._activatedRoute,
    });
  }

  handleViewCategory(value: any): any {
    this._router.navigate([`../view-category/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handleEditCategory(value: any): any {
    this._router.navigate([`../view-category/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: true },
    });
  }
}
