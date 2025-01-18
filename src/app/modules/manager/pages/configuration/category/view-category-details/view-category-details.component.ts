import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, map } from 'rxjs';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { CategoryFormComponent } from '@app/modules/manager/components/configuration/category/category-form/category-form.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';

@Component({
  selector: 'app-view-category-details',
  standalone: true,
  imports: [CommonModule, LoaderComponent, CategoryFormComponent, SecondaryButton],
  templateUrl: './view-category-details.component.html',
  styleUrls: ['./view-category-details.component.scss'],
})
export class ViewCategoryDetailsComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;

  categoryDetails: any;

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
      console.log(this.editMode);
    });
  }

  ngOnInit(): void {
    console.log(this.oid);
    this.loadCategoryDetails();
  }

  goBack(): void {
    this._location.back();
  }

  handleActions(event: any): any {
    // Update
    if (event.action === 'submit') {
      this.updateCategoryDetails(event.value);
    } else if (event.action === 'back') {
      this.goBack();
    }
  }

  updateCategoryDetails(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.UPDATE_CATEGORY_DETAILS, payload)
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

  loadCategoryDetails(): any {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_CATEGORY_DETAILS, {oid: this.oid})
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
