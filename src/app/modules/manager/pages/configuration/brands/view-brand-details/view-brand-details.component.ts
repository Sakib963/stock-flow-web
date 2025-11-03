import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { BrandFormComponent } from '@app/modules/manager/components/configuration/brands/brand-form/brand-form.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, finalize } from 'rxjs';

@Component({
  selector: 'view-brand-details',
    imports: [CommonModule, LoaderComponent, BrandFormComponent, SecondaryButton],
  templateUrl: './view-brand-details.component.html',
  styleUrl: './view-brand-details.component.scss'
})
export class ViewBrandDetailsComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;

  brandDetails: any;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router,
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
    this.loadBrandDetails();
  }

  goBack(): void {
    this._location.back();
  }

  handleActions(event: any): any {
    // Update
    if (event.action === 'submit') {
      this.updateBrandDetails(event.value);
    } else if (event.action === 'back') {
      this.goBack();
    }
  }

  updateBrandDetails(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.UPDATE_BRAND_DETAILS, payload)
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

  loadBrandDetails(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_BRAND_DETAILS, {oid: this.oid})
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.brandDetails = res?.body?.data;
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
