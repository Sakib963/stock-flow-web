import { Component, computed, DestroyRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { AisleFormComponent } from '@app/modules/configuration/components/aisle/aisle-form/aisle-form.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { catchError, EMPTY, finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FormActions } from '@app/core/interfaces/form-action';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';

@Component({
    selector: 'app-create-aisle',
    imports: [PageHeaderComponent, NgZorroCustomModule, AisleFormComponent],
    templateUrl: './create-aisle.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./create-aisle.component.scss'],
})
export class CreateAisleComponent {
    private readonly _location = inject(Location);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _configurationService = inject(ConfigurationService);

    buttonLoading = signal(false);

    addUrl = computed(() => APIEndpoint.CREATE_AISLE ?? null);

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
                    const message = backendMessage ? backendMessage : err.message || 'Failed to create aisle';

                    this._notificationService.error('Aisle Create', message);
                    return EMPTY;
                }),
                finalize(() => {
                    this.buttonLoading.set(false);
                })
            )
            .subscribe({
                next: (response) => {
                    if (response.body?.code === 200) {
                        const notificationRef = this._notificationService.success('Aisle Create', response.body?.message || 'Aisle created successfully');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                            this._location.back();
                        });
                    } else {
                        const notificationRef = this._notificationService.warning('Aisle Create', response.body?.message || 'Unable To Create Aisle');
                        notificationRef.onClose.subscribe(() => {
                            this.buttonLoading.set(false);
                        });
                    }
                },
            });
    }
}
