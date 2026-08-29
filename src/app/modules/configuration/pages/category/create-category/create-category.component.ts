import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { CategoryFormComponent } from '@app/modules/configuration/components/category-form/category-form.component';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { catchError, EMPTY, finalize } from 'rxjs';

@Component({
  selector: 'create-category',
  imports: [PageHeaderComponent, NgZorroCustomModule, CategoryFormComponent],
  templateUrl: './create-category.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './create-category.component.scss',
})
export class CreateCategoryComponent {
  private readonly _location = inject(Location);
  private readonly _notificationService = inject(NzNotificationService);
  private readonly _configurationService = inject(ConfigurationService);

  buttonLoading = signal(false);

  addUrl = computed(() => APIEndpoint.CREATE_CATEGORY ?? null);

  goBack(): void {
    this._location.back();
  }

  onFormActions($event: FormActions): void {
    if ($event.action !== 'save') {
      return;
    }
    this.buttonLoading.set(true);
    this._configurationService
      .createItem$(this.addUrl(), $event.data)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.buttonLoading.set(false);
          const backendMessage = err.error?.message;
          const message = backendMessage
            ? backendMessage
            : err.message || 'Failed to create category';

          this._notificationService.error('Category Create', message);
          return EMPTY;
        }),
        finalize(() => {
          this.buttonLoading.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          if (response.body?.code === 200) {
            const notificationRef = this._notificationService.success(
              'Category Create',
              response.body?.message || 'Category created successfully'
            );
            notificationRef.onClose.subscribe(() => {
              this.buttonLoading.set(false);
              this._location.back();
            });
          } else {
            const notificationRef = this._notificationService.warning(
              'Category Create',
              response.body?.message || 'Unable To Create Category'
            );
            notificationRef.onClose.subscribe(() => {
              this.buttonLoading.set(false);
            });
          }
        },
      });
  }
}
