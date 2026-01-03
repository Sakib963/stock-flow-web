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
import { ActivatedRoute } from '@angular/router';
import { WindowState } from '@app/core/config/window-state.config';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CategoryFormActions } from '@app/core/interfaces/form-action';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
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
  imports: [PageHeaderComponent, NgZorroCustomModule],
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
  submitLoading = signal(false);

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

  onFormActions($event: CategoryFormActions): void {
    if ($event.action === 'cancel') {
      this.editMode = false;
    }
    if ($event.action !== 'update') {
      return;
    }
    this.submitLoading.set(true);
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
          this.submitLoading.set(false);
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
              this.submitLoading.set(false);
            });
          }
        },
      });
  }
}
