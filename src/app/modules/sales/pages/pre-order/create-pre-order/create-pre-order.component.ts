import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { PreOrderFormComponent } from '@app/modules/sales/components/pre-order-form/pre-order-form.component';
import { SalesService } from '@app/modules/sales/services/sales.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { catchError, EMPTY, finalize } from 'rxjs';

@Component({
    selector: 'create-pre-order',
    imports: [PageHeaderComponent, NgZorroCustomModule, PreOrderFormComponent],
    templateUrl: './create-pre-order.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './create-pre-order.component.scss',
})
export class CreatePreOrderComponent {
    private readonly _location = inject(Location);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _salesService = inject(SalesService);

    buttonLoading = signal(false);

    addUrl = computed(() => APIEndpoint.CREATE_PRE_ORDER ?? null);

    goBack(): void {
        this._location.back();
    }

    onFormActions($event: FormActions): void {
        if ($event.action !== 'save') {
            return;
        }
        this.buttonLoading.set(true);
        this._salesService
            .createItem$(this.addUrl(), $event.data)
            .pipe(
                catchError((err: HttpErrorResponse) => {
                    this.buttonLoading.set(false);
                    const backendMessage = err.error?.message;
                    const message = backendMessage ? backendMessage : err.message || 'Failed to create pre-order';

                    this._notificationService.error('Pre-Order Create', message);
                    return EMPTY;
                }),
                finalize(() => {
                    this.buttonLoading.set(false);
                })
            )
            .subscribe({
                next: (response) => {
                    if (response.body?.code === 200) {
                        const notificationRef = this._notificationService.success('Pre-Order Create', response.body?.message || 'Pre-order created successfully');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                            this._location.back();
                        });
                    } else {
                        const notificationRef = this._notificationService.warning('Pre-Order Create', response.body?.message || 'Unable To Create Pre-Order');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                        });
                    }
                },
            });
    }
}
