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
import { PrimaryButtonWithPlusIcon } from '@app/shared/components/buttons/primary-button-with-plus-icon/primary-button-with-plus-icon.component';
import { ViewSupplierDealerDetailsComponent } from '../view-supplier-dealer-details/view-supplier-dealer-details.component';
import { ViewSupplierDealerListComponent } from "../../../../components/configuration/supplier-dealer/view-supplier-dealer-list/view-supplier-dealer-list.component";
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';

@Component({
  selector: 'app-display-supplier-dealer-list',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButtonWithPlusIcon,
    ViewSupplierDealerListComponent
],
  templateUrl: './display-supplier-dealer-list.component.html',
  styleUrls: ['./display-supplier-dealer-list.component.scss'],
})
export class DisplaySupplierDealerListComponent implements OnInit {
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

  sourceTypes: any = [];

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.sourceTypes = DROPDOWN_OPTIONS.SOURCE_TYPES;
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
      .get(APIEndpoint.GET_SUPPLIER_DEALER_LIST, this.payload)
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
              console.log(this.data);
              
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
      this.handleAdd();
    } else if (event.action === 'view') {
      this.handleView(event.value.oid);
    } else if (event.action === 'edit') {
      this.handleEdit(event.value.oid);
    }
  }

  handleAdd(): any {
    this._router.navigate(['../create-supplier-dealer'], {
      relativeTo: this._activatedRoute,
    });
  }

  handleView(value: any): any {
    this._router.navigate([`../view-supplier-dealer/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handleEdit(value: any): any {
    this._router.navigate([`../view-supplier-dealer/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: true },
    });
  }
}
