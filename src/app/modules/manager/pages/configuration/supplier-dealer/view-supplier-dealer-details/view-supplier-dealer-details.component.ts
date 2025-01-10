import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { SupplierDealerFormComponent } from '@app/modules/manager/components/configuration/supplier-dealer/supplier-dealer-form/supplier-dealer-form.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, finalize } from 'rxjs';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';

@Component({
  selector: 'app-view-supplier-dealer-details',
  standalone: true,
  imports: [CommonModule, SupplierDealerFormComponent, LoaderComponent, SecondaryButton],
  templateUrl: './view-supplier-dealer-details.component.html',
  styleUrls: ['./view-supplier-dealer-details.component.scss']
})
export class ViewSupplierDealerDetailsComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;

  sourceTypes: any = [];

  supplierDealerDetails: any;

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
    this.sourceTypes = DROPDOWN_OPTIONS.SOURCE_TYPES;
    this.loadSupplierDealerDetails();
  }

  goBack(): void {
    this._location.back();
  }

  handleActions(event: any): any {
    // Update
    if (event.action === 'submit') {
      this.updateSupplierDealerDetails(event.value);
    } else if (event.action === 'back') {
      this.goBack();
    }
  }

  getSourceType(source_type: any): any {
    const item = this.sourceTypes.find((item: any) => item.value === source_type);
    if (item) {
      return item?.label
    } else {
      return ''
    }
  }

  updateSupplierDealerDetails(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.UPDATE_SUPPLIER_DEALER_DETAILS, payload)
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

  loadSupplierDealerDetails(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_SUPPLIER_DEALER_DETAILS, {oid: this.oid})
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.supplierDealerDetails = res?.body?.data;
            console.log(this.supplierDealerDetails);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
