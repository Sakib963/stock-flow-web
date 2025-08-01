import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { SafeTextPipe } from '@app/shared/pipe/safe-text.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, finalize } from 'rxjs';

@Component({
  selector: 'view-product-dispose-details',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    SecondaryButton,
    SafeTextPipe,
    NgZorroCustomModule,
    TranslateModule,
  ],
  templateUrl: './view-product-dispose-details.component.html',
  styleUrls: ['./view-product-dispose-details.component.scss'],
})
export class ViewProductDisposeDetailsComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;
  returnReasons: any = [];

  disposeDetails: any;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _activatedRoute: ActivatedRoute,
    private _location: Location,
    private _router: Router
  ) {
    const state$ = this._activatedRoute.paramMap.pipe(
      map(() => window.history.state)
    );
    state$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((res: any) => {
      this.editMode = res.edit;
    });
  }

  ngOnInit(): void {
    this.loadProductDisposeDetails();
    this.returnReasons = DROPDOWN_OPTIONS.PRODUCT_RETURN_REASONS;
  }

  goBack(): void {
    this._location.back();
  }

  handleActions(event: any): any {
    if (event.action === 'back') {
      this.goBack();
    } else {
      console.log('Action not handled:', event.action);
    }
  }

  redirectToSale(): void {
    this._router.navigate(
      [
        '/manager/inventory/invoice/invoice-list/view-invoice',
        this.disposeDetails?.sales_oid,
      ],
      { state: { edit: false } }
    );
  }

  redirectToSupplier(item: any): void {
    if (item?.supplier_oid) {
      this._router.navigate(
        ['/manager/configuration/supplier/view-supplier', item.supplier_oid],
        { state: { edit: false } }
      );
    }
  }

  getReturnReasonLabel(reason: string): string {
    return (
      this.returnReasons.find((r: any) => r.value === reason)?.label ||
      'Unknown Reason'
    );
  }

  loadProductDisposeDetails(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_PRODUCT_DISPOSE_DETAILS, {
        oid: this.oid,
      })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.disposeDetails = res?.body?.data;
            console.log(this.disposeDetails);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
