import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { finalize } from 'rxjs';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { ActivatedRoute, Router } from '@angular/router';
import { NzModalService } from 'ng-zorro-antd/modal';
import { UpdatePricingModalComponent } from '@app/modules/manager/components/inventory/update-pricing-modal/update-pricing-modal.component';
import { FormsModule } from '@angular/forms';
import { NgxBarcode6Module } from 'ngx-barcode6';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { PrintService } from '@app/core/services/print.service';
import { COMPANY_INFO } from '@app/core/constants/company-info';

@Component({
  selector: 'app-view-inventory-overview-details',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    SecondaryButton,
    AngularSvgIconModule,
    NgZorroCustomModule,
    FormsModule,
    NgxBarcode6Module,
    PrimaryButton,
  ],
  templateUrl: './view-inventory-overview-details.component.html',
  styleUrls: ['./view-inventory-overview-details.component.scss'],
})
export class ViewInventoryOverviewDetailsComponent implements OnInit {
  @Input() oid: any;
  loading: boolean = false;
  productDetails: any;
  batch_data: any[] = [];
  productNatureList: any = [];
  unitTypes: any = [];

  isBarcodeDrawerVisible = false;
  barcodePreviewData: {
    productName: string;
    batchCode: string;
    companyName: string;
    price: number | null;
    quantityAvailable: number;
  } | null = null;
  printQuantity = 1;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _location: Location,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _modal: NzModalService,
    private _printService: PrintService
  ) {}

  ngOnInit(): void {
    this.loadItemDetails();
    this.productNatureList = DROPDOWN_OPTIONS.PRODUCT_NATURE;
    this.unitTypes = DROPDOWN_OPTIONS.MEASUREMENT_UNITS;
  }

  getRestockThresholdStatus(item: any): boolean {
    if (item?.total_available_quantity < item?.restock_threshold) {
      return true;
    } else {
      return false;
    }
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

  loadItemDetails(): void {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_PRODUCT_DETAILS_FOR_OVERVIEW, {
        product_oid: this.oid,
      })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.productDetails = res?.body?.data;
            this.batch_data = res?.body?.data?.batch_data;
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  handleAction(type: any, item: any): void {
    console.log('handleAction');
  }

  redirectToProduct(): void {
    this._router.navigate(
      [
        `/manager/configuration/product/view-product/${this.productDetails.oid}`,
      ],
      { state: { edit: false } }
    );
  }

  getPricingStatus(item: any): boolean {
    if (item.intended_use === 'for_sale') return false;
    return true;
  }

  displayUpdatePricingModal(item: any): void {
    const modalData = {
      formData: {
        oid: item.inventory_oid,
        selling_price: item.selling_price,
        maximum_discount: item.maximum_discount,
      },
      cost_price: item.cost_price,
      batch_code: item.batch_code,
    };
    const modal = this._modal.create({
      nzContent: UpdatePricingModalComponent,
      nzFooter: null,
      nzClosable: false,
      nzData: modalData,
    });

    // Handle the result after the modal closes
    modal.afterClose.subscribe((result) => {
      if (result) {
        console.log(result);
        this.updatePricing(result);
      }
    });
  }

  generateBarcode(item: any): void {
    const showPrice = item.intended_use === 'for_sale';

    if (showPrice && !item.selling_price) {
      this._notificationService.warning(
        'Missing Price',
        'Cannot generate barcode: Selling price is missing.'
      );
      return;
    }

    this.barcodePreviewData = {
      productName: this.productDetails?.name,
      batchCode: item.batch_code,
      companyName: COMPANY_INFO.name,
      price: showPrice ? item.selling_price : null,
      quantityAvailable: item.quantity_available,
    };
    console.log('Barcode preview data:', this.barcodePreviewData);
    this.printQuantity = 1;

    this.isBarcodeDrawerVisible = true;
  }

  printBarcode(count: number): void {
    if (!this.barcodePreviewData) return;
    this._printService.printBarcodes(this.barcodePreviewData);
  }

  updatePricing(payload: any): void {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.UPDATE_PRICING, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          this._notificationService.success('Success!', res?.body?.message);
          this.loadItemDetails();
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  getRibbonColor(item: any): any {
    if (item.status === 'internal_use') {
      return '';
    } else if (item.status === 'ready_for_sale') {
      return 'green';
    } else if (item.status === 'pending_pricing') {
      return 'purple';
    }
  }

  getStatusText(status: string | null): string {
    if (status === 'internal_use') {
      return 'Internal Use';
    } else if (status === 'ready_for_sale') {
      return 'Ready for Sale';
    } else if (status === 'pending_pricing') {
      return 'Pending Pricing';
    }
    return 'Unknown Status';
  }

  closeDrawer(): void {
    this.isBarcodeDrawerVisible = false;
  }
}
