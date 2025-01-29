import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, finalize } from 'rxjs';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PurchaseFormComponent } from '@app/modules/manager/components/inventory/purchase/purchase-form/purchase-form.component';
import { SingleItemCardComponent } from '@app/modules/manager/components/inventory/purchase/single-item-card/single-item-card.component';

@Component({
  selector: 'app-view-product-purchase',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    PurchaseFormComponent,
    SecondaryButton,
    SingleItemCardComponent
  ],
  templateUrl: './view-product-purchase.component.html',
  styleUrls: ['./view-product-purchase.component.scss'],
})
export class ViewProductPurchaseComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;

  purchaseDetails: any;
  products: any[] = [];

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
    this.loadPurchaseDetails();
  }

  goBack(): void {
    this._location.back();
  }

  handleActions(event: any): any {
    // Update
    if (event.action === 'submit') {
      this.updatePurchaseDetails(event.value);
    } else if (event.action === 'back') {
      this.goBack();
    }
  }

  updatePurchaseDetails(payload: any): any {
    this.loading = true;
    console.log(payload);

    /*  this._httpService
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
      }); */
  }

  loadPurchaseDetails(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_PURCHASE_DETAILS, { oid: this.oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.purchaseDetails = res?.body?.data;
            this.products = this.purchaseDetails.products;
            console.log(this.purchaseDetails, 'purchaseDetails');
            console.log(this.products, 'products');
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
