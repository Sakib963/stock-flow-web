import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, finalize } from 'rxjs';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { ProductFormComponent } from '@app/modules/manager/components/configuration/product/product-form/product-form.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';

@Component({
  selector: 'app-view-product-details',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    ProductFormComponent,
    SecondaryButton,
  ],
  templateUrl: './view-product-details.component.html',
  styleUrls: ['./view-product-details.component.scss'],
})
export class ViewProductDetailsComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;
  productNatureList: any = [];
  unitTypes: any = [];

  productDetails: any;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _activatedRoute: ActivatedRoute,
    private _location: Location
  ) {
    const state$ = this._activatedRoute.paramMap.pipe(
      map(() => window.history.state)
    );
    state$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((res: any) => {
      this.editMode = res.edit;
    });
  }

  ngOnInit(): void {
    this.loadProductDetails();
    this.productNatureList = DROPDOWN_OPTIONS.PRODUCT_NATURE;
    this.unitTypes = DROPDOWN_OPTIONS.MEASUREMENT_UNITS;
  }

  goBack(): void {
    this._location.back();
  }

  getLabel(
    value: string | number,
    type: 'unit_type' | 'product_nature'
  ): string {
    let list = [];

    if (type === 'unit_type') {
      list = this.unitTypes;
    } else if (type === 'product_nature') {
      list = this.productNatureList;
    }

    const item = list.find((option: any) => option.value === value);
    return item ? item.label : 'Unknown';
  }

  handleActions(event: any): any {
    // Update
    if (event.action === 'submit') {
      this.updateProductDetails(event.value);
    } else if (event.action === 'back') {
      this.goBack();
    }
  }

  updateProductDetails(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.UPDATE_PRODUCT_DETAILS, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          this._notificationService.success('Success!', res?.body?.message);
          this._location.back();
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  loadProductDetails(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_PRODUCT_DETAILS, { oid: this.oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.productDetails = res?.body?.data;
            console.log(this.productDetails);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
