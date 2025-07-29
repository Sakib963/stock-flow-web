import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, finalize } from 'rxjs';
import { SafeTextPipe } from '@app/shared/pipe/safe-text.pipe';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'view-product-return-details',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    SecondaryButton,
    SafeTextPipe,
    NgZorroCustomModule,
    TranslateModule,
  ],
  templateUrl: './view-product-return-details.component.html',
  styleUrls: ['./view-product-return-details.component.scss'],
})
export class ViewProductReturnDetailsComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;
  returnReasons: any = [];

  returnDetails: any;

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
    this.loadProductDetails();
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
      ['/sales/invoice/view-invoice', this.returnDetails?.sales_oid],
      { state: { edit: false } }
    );
  }

  getReturnReasonLabel(reason: string): string {
    return (
      this.returnReasons.find((r: any) => r.value === reason)?.label ||
      'Unknown Reason'
    );
  }

  loadProductDetails(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_PRODUCT_RETURN_DETAILS, { oid: this.oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.returnDetails = res?.body?.data;
            console.log(this.returnDetails);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
