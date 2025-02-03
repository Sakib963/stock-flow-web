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

@Component({
  selector: 'app-view-inventory-overview-details',
  standalone: true,
  imports: [CommonModule, LoaderComponent, SecondaryButton, AngularSvgIconModule],
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

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _location: Location,
  ) {}

  ngOnInit(): void {
    this.loadItemDetails();
    this.productNatureList = DROPDOWN_OPTIONS.PRODUCT_NATURE;
    this.unitTypes = DROPDOWN_OPTIONS.MEASUREMENT_UNITS;
  }

  getRestockThresholdStatus(item: any): boolean {
    if (item?.total_available_quantity < item?.restock_threshold) {
      return true
    } else {
      return false
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
            console.table(this.batch_data);
            console.info(this.productDetails);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
