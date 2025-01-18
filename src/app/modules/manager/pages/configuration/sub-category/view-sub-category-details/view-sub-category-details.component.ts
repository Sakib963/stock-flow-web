import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { map, finalize } from 'rxjs';
import { SubCategoryFormComponent } from '@app/modules/manager/components/configuration/sub-category/sub-category-form/sub-category-form.component';

@Component({
  selector: 'app-view-sub-category-details',
  standalone: true,
  imports: [
    CommonModule,
    LoaderComponent,
    SubCategoryFormComponent,
    SecondaryButton,
  ],
  templateUrl: './view-sub-category-details.component.html',
  styleUrls: ['./view-sub-category-details.component.scss'],
})
export class ViewSubCategoryDetailsComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;

  categoryDetails: any;

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
    this.loadItemDetails();
  }

  goBack(): void {
    this._location.back();
  }

  handleActions(event: any): any {
    // Update
    if (event.action === 'submit') {
      this.updateItemDetails(event.value);
    } else if (event.action === 'back') {
      this.goBack();
    }
  }

  updateItemDetails(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.UPDATE_SUB_CATEGORY_DETAILS, payload)
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

  loadItemDetails(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_SUB_CATEGORY_DETAILS, { oid: this.oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.categoryDetails = res?.body?.data;
            console.log(this.categoryDetails);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
