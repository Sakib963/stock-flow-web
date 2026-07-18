import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { ProductDisposeFormComponent } from '@app/modules/inventory/components/product-dispose/product-dispose-form/product-dispose-form.component';
import { InventoryService } from '@app/modules/inventory/services/inventory.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { catchError, EMPTY, finalize } from 'rxjs';

@Component({
    selector: 'create-product-dispose',
    imports: [ProductDisposeFormComponent, PageHeaderComponent, NgZorroCustomModule],
    templateUrl: './create-product-dispose.component.html',
    styleUrl: './create-product-dispose.component.scss',
})
export class CreateProductDisposeComponent {
    private readonly _location = inject(Location);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _inventoryService = inject(InventoryService);

    buttonLoading = signal(false);

    addUrl = computed(() => APIEndpoint.CREATE_PRODUCT_DISPOSE ?? null);

    goBack(): void {
        this._location.back();
    }

    onFormActions($event: FormActions): void {
        if ($event.action !== 'save') {
            return;
        }
        this.buttonLoading.set(true);
        this._inventoryService
            .createItem$(this.addUrl(), $event.data)
            .pipe(
                catchError((err: HttpErrorResponse) => {
                    this.buttonLoading.set(false);
                    const backendMessage = err.error?.message;
                    const message = backendMessage ? backendMessage : err.message || 'Failed to create disposal';
                    this._notificationService.error('Product Dispose Create', message);
                    return EMPTY;
                }),
                finalize(() => {
                    this.buttonLoading.set(false);
                })
            )
            .subscribe({
                next: (response) => {
                    if (response.body?.code === 200) {
                        const notificationRef = this._notificationService.success('Product Dispose Create', response.body?.message || 'Disposal created successfully');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                            this._location.back();
                        });
                    } else {
                        const notificationRef = this._notificationService.warning('Product Dispose Create', response.body?.message || 'Unable To Create Disposal');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                        });
                    }
                },
            });
    }
}
