import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { WindowState } from '@app/core/config/window-state.config';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { CategoryFormComponent } from '@app/modules/configuration/components/category-form/category-form.component';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NotFoundComponent } from '@app/shared/components/not-found/not-found.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import {
  Subject,
  combineLatest,
  startWith,
  tap,
  switchMap,
  map,
  catchError,
  EMPTY,
  finalize,
} from 'rxjs';

@Component({
  selector: 'view-category-details',
  imports: [
    PageHeaderComponent,
    NgZorroCustomModule,
    FormsModule,
    CategoryFormComponent,
    NotFoundComponent,
    LoaderComponent
  ],
  templateUrl: './view-category-details.component.html',
  styleUrl: './view-category-details.component.scss',
})
export class ViewCategoryDetailsComponent {
  itemId = input.required<string>({ alias: 'oid' });

  loading = signal<boolean>(false);

  editMode = false;
  state = signal<WindowState | null>(null);
  action = computed(() => this.state()?.action || 'view');
  editable = computed(() => this.action() === 'view');

  private readonly _location = inject(Location);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _notificationService = inject(NzNotificationService);
  private readonly _configurationService = inject(ConfigurationService);

  detailUrl = computed(() => APIEndpoint.GET_CATEGORY_DETAILS ?? null);
  updateUrl = computed(() => APIEndpoint.UPDATE_CATEGORY_DETAILS ?? null);
  buttonLoading = signal(false);

  private _reload$ = new Subject<void>();

  private _category$ = combineLatest([
    this._reload$.pipe(startWith(undefined)),
    toObservable(this.detailUrl),
    toObservable(this.itemId),
  ]).pipe(
    tap(() => {
      this.loading.set(true);
    }),
    switchMap(([_, url, id]) =>
      this._configurationService.getDetail$(url!, id).pipe(
        map((response) => response.body.data),
        catchError((error: HttpErrorResponse | Error) => {
          this.loading.set(false);
          const message =
            error instanceof HttpErrorResponse
              ? `${error.error?.message || error.message}`
              : `Category not found`;
          this._notificationService.error('Category Detail', message);
          return EMPTY;
        }),
        finalize(() => {
          this.loading.set(false);
        })
      )
    )
  );

  category = toSignal(this._category$, { initialValue: null });

  // Static data - will be replaced with API calls
  categoryStats = signal<any>({
    totalProducts: 45,
    totalInventoryValue: 125000,
    lowStockItems: 8,
    outOfStockItems: 3,
    averageProductPrice: 2780
  });

  relatedProducts = signal<any[]>([
    { oid: '1', name: 'Product A', sku: 'SKU-001', stock: 150, price: 2500, status: 'Active' },
    { oid: '2', name: 'Product B', sku: 'SKU-002', stock: 5, price: 3200, status: 'Active' },
    { oid: '3', name: 'Product C', sku: 'SKU-003', stock: 0, price: 1800, status: 'Inactive' },
    { oid: '4', name: 'Product D', sku: 'SKU-004', stock: 200, price: 4500, status: 'Active' },
    { oid: '5', name: 'Product E', sku: 'SKU-005', stock: 12, price: 2100, status: 'Active' },
  ]);

  activityTimeline = signal<any[]>([
    { date: '2026-01-05 10:30', user: 'John Doe', action: 'Updated category description' },
    { date: '2026-01-03 14:15', user: 'Jane Smith', action: 'Changed category status to Active' },
    { date: '2025-12-28 09:00', user: 'Admin User', action: 'Created category' },
  ]);

  async ngOnInit() {
    this.state.set(window.history.state as WindowState);
    this.editMode =
      typeof window !== 'undefined' && window.history.state?.edit === true;
  }

  handleSwitchChange(event: boolean): void {
    this.editMode = event;
  }

  onRefresh(): void {
    this._reload$.next();
  }

  navigateBack(): void {
    this._location.back();
  }

  onFormActions($event: FormActions): void {
    if ($event.action === 'cancel') {
      this.editMode = false;
    }
    if ($event.action !== 'update') {
      return;
    }
    this.buttonLoading.set(true);
    this._configurationService
      .updateItem$(this.updateUrl(), $event.data)
      .pipe(
        catchError((err) => {
          const message =
            err instanceof HttpErrorResponse
              ? `Failed to update category: ${
                  err.error?.message || err.message
                }`
              : `Failed to update category`;
          this._notificationService.error('Category Update', message);
          return EMPTY;
        }),
        finalize(() => {
          this.buttonLoading.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          if (response.status === 200) {
            this._reload$.next();
            this.editMode = false;
          } else {
            const notificationRef = this._notificationService.warning(
              'Category Update',
              response.body?.message || 'Unable To Update Category'
            );
            notificationRef.onClose.subscribe(() => {
              this.buttonLoading.set(false);
            });
          }
        },
      });
  }

  // Quick Actions
  viewAllProducts(): void {
    this._notificationService.info('View Products', 'Navigating to products in this category...');
    // TODO: Navigate to products list with category filter
  }

  generateReport(): void {
    this._notificationService.info('Generate Report', 'Generating category report...');
    // TODO: Implement report generation
  }

  exportData(): void {
    this._notificationService.info('Export Data', 'Exporting category data...');
    // TODO: Implement data export
  }

  duplicateCategory(): void {
    this._notificationService.info('Duplicate Category', 'Creating a copy of this category...');
    // TODO: Implement category duplication
  }

  viewProduct(productId: string): void {
    this._notificationService.info('View Product', `Viewing product ${productId}`);
    // TODO: Navigate to product details
  }

  editProduct(productId: string): void {
    this._notificationService.info('Edit Product', `Editing product ${productId}`);
    // TODO: Navigate to product edit
  }
}
