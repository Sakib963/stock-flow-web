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
import { WarehouseFormComponent } from '@app/modules/manager/components/configuration/warehouse/warehouse-form/warehouse-form.component';

@Component({
  selector: 'app-view-warehouse-details',
  standalone: true,
  imports: [CommonModule, LoaderComponent, WarehouseFormComponent, SecondaryButton],
  templateUrl: './view-warehouse-details.component.html',
  styleUrls: ['./view-warehouse-details.component.scss'],
})
export class ViewWarehouseDetailsComponent implements OnInit {
  @Input() oid: any;
  editMode: boolean = false;
  loading: boolean = false;

  itemDetails: any;

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
    if (event.action === 'submit') {
      this.updateItemDetails(event.value);
    } else if (event.action === 'back') {
      this.goBack();
    }
  }

  updateItemDetails(payload: any): any {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.UPDATE_WAREHOUSE_DETAILS, payload)
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
      .get(APIEndpoint.GET_WAREHOUSE_DETAILS, { oid: this.oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.itemDetails = res?.body?.data;
            console.log(this.itemDetails);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
