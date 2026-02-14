import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { ProductFormComponent } from '@app/modules/configuration/components/product-form/product-form.component';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { catchError, EMPTY, finalize } from 'rxjs';

@Component({
  selector: 'create-product',
  imports: [PageHeaderComponent, NgZorroCustomModule, ProductFormComponent],
  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.scss'
})
export class CreateProductComponent {
  private readonly _location = inject(Location);
  private readonly _notificationService = inject(NzNotificationService);
  private readonly _configurationService = inject(ConfigurationService);

  buttonLoading = signal(false);

  addUrl = computed(() => APIEndpoint.CREATE_PRODUCT ?? null);

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
          const message = backendMessage ? backendMessage : err.message || 'Failed to create product';

          this._notificationService.error('Product Create', message);
          return EMPTY;
        }),
        finalize(() => {
          this.buttonLoading.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          if (response.body?.code === 200) {
            const notificationRef = this._notificationService.success('Product Create', response.body?.message || 'Product created successfully');
            notificationRef.onClose.subscribe(() => {
              this.buttonLoading.set(false);
              this._location.back();
            });
          } else {
            const notificationRef = this._notificationService.warning('Product Create', response.body?.message || 'Unable To Create Product');
            notificationRef.onClose.subscribe(() => {
              this.buttonLoading.set(false);
            });
          }
        },
      });
  }
}
