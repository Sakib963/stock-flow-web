import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FormActions } from '@app/core/interfaces/form-action';
import { BrandFormComponent } from '@app/modules/configuration/components/brand-form/brand-form.component';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { catchError, EMPTY, finalize } from 'rxjs';

@Component({
  selector: 'create-brand',
    imports: [PageHeaderComponent, NgZorroCustomModule, BrandFormComponent],
  templateUrl: './create-brand.component.html',
  styleUrl: './create-brand.component.scss'
})
export class CreateBrandComponent {
    private readonly _location = inject(Location);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _configurationService = inject(ConfigurationService);

    buttonLoading = signal(false);

    addUrl = computed(() => APIEndpoint.CREATE_BRAND ?? null);

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
                    const message = backendMessage ? backendMessage : err.message || 'Failed to create brand';

                    this._notificationService.error('Brand Create', message);
                    return EMPTY;
                }),
                finalize(() => {
                    this.buttonLoading.set(false);
                })
            )
            .subscribe({
                next: (response) => {
                    if (response.body?.code === 200) {
                        const notificationRef = this._notificationService.success('Brand Create', response.body?.message || 'Brand created successfully');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                            this._location.back();
                        });
                    } else {
                        const notificationRef = this._notificationService.warning('Brand Create', response.body?.message || 'Unable To Create Brand');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                        });
                    }
                },
            });
    }

}
