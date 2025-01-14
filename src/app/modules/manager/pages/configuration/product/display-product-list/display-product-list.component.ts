import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { ViewProductListComponent } from '@app/modules/manager/components/configuration/product/view-product-list/view-product-list.component';
import { PrimaryButtonWithPlusIcon } from '@app/shared/components/buttons/primary-button-with-plus-icon/primary-button-with-plus-icon.component';

@Component({
  selector: 'app-display-product-list',
  standalone: true,
  imports: [CommonModule,
      LoaderComponent,
      NgZorroCustomModule,
      ReactiveFormsModule,
      ViewProductListComponent,
      PrimaryButtonWithPlusIcon
      ],
  templateUrl: './display-product-list.component.html',
  styleUrls: ['./display-product-list.component.scss']
})
export class DisplayProductListComponent implements OnInit {
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
    this.loadProductList();
    this.searchControl.valueChanges.subscribe((value) => {
      this.onSearchChange(value);
    });
  }

  onSearchChange(value: string): void {
    this.payload.search_text = value;
    this.isFilter = true;
    this.loadProductList();
  }

  loadProductList(): any {
    if (!this.isFilter) {
      this.loading = true;
    }
    this._httpService
      .get(APIEndpoint.GET_PRODUCT_LIST, this.payload)
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
            console.log(this.data);
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
      this.handleAdd();
    } else if (event.action === 'view') {
      this.handleView(event.value.oid);
    } else if (event.action === 'edit') {
      this.handleEdit(event.value.oid);
    }
  }

  handleAdd(): any {
    this._router.navigate(['../create-product'], {
      relativeTo: this._activatedRoute,
    });
  }

  handleView(value: any): any {
    this._router.navigate([`../view-product/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handleEdit(value: any): any {
    this._router.navigate([`../view-product/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: true },
    });
  }

}