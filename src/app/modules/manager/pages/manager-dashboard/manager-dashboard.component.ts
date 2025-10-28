import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { HttpService } from '@app/core/services/http.service';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { SafeTextPipe } from '@app/shared/pipe/safe-text.pipe';

@Component({
  selector: 'app-manager-dashboard',
  imports: [
    CommonModule,
    AngularSvgIconModule,
    LoaderComponent,
    NgZorroCustomModule,
    SafeTextPipe
  ],
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.scss'],
})
export class ManagerDashboardComponent implements OnInit {
  data: any;
  recent_sales: any[] = [];
  trending_products: any[] = [];
  loading: boolean = false;

  constructor(
    private _router: Router,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService
  ) {}

  ngOnInit(): void {
    this.loadDashboardDataForManager();
  }

  redirectToUrl(type: any): any {
    console.log(type);
    if (type === 'Product') {
    } else if (type === 'Categories') {
      this._router.navigate(['/category/category-list']);
    }
  }

  loadDashboardDataForManager(): void {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_DASHBOARD_DATA_FOR_MANAGER)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.body.code === 200) {
            this.data = res.body.data;
            this.recent_sales = res.body?.data?.recent_sales ?? [];
            this.trending_products = res.body?.data?.trending_products_this_month ?? [];
          }
        },
        error: (err: any) => {
          console.error(err.message);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }
}
