import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmCopy } from '@app/core/models/form.model';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { AisleFormComponent } from '@app/modules/configuration/aisle/components/aisle-form/aisle-form.component';
import { AisleService } from '@app/modules/configuration/aisle/services/aisle.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';
import { PageBack } from '@app/core/models/page-header.model';
import { AISLE_ROUTES } from '@app/modules/configuration/aisle/constants/aisle-routes';
import { AISLE_TAKEN } from '@app/modules/configuration/aisle/constants/aisle-copy';

/** Adding an aisle. The form is the shared component; this page saves it and says where to go. */
@Component({
    selector: 'aisle-create',
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, AisleFormComponent],
    templateUrl: './aisle-create.component.html',
    styleUrl: './aisle-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AisleCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _aisles = inject(AisleService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    readonly back: PageBack = { route: AISLE_ROUTES.list };
    readonly editor = viewChild(AisleFormComponent);
    // Set the moment Save is pressed, because the form may still be waiting on an availability
    // check and the request has not started yet. Without it a second press starts a second wait.
    private readonly _submitting = signal(false);

    readonly saving = computed(() => this._submitting() || this._aisles.saving());

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.form.dirty;
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;

        this._submitting.set(true);
        editor.ready().subscribe((ready) => {
            if (!ready) {
                this._submitting.set(false);
                this._message.error(this._translate.instant('form.fixErrors'));
                return;
            }

            // Released while the question is open, so Save is not spinning behind the dialog for a
            // write that has not started.
            this._submitting.set(false);
            const payload = editor.payload();
            confirmAction(this._modal, this.confirmCopy(payload.name, payload.code)).subscribe((confirmed) => {
                if (!confirmed) return;
                this._submitting.set(true);
                this._aisles.create(payload).subscribe({
                    next: (oid) => {
                        this._submitting.set(false);
                        editor.form.markAsPristine();
                        this._message.success(this._translate.instant('configuration.aisle.createdMessage'));
                        void this._router.navigateByUrl(AISLE_ROUTES.detail(oid));
                    },
                    error: (error: unknown) => {
                        this._submitting.set(false);
                        this.onFailed(error);
                    },
                });
            });
        });
    }

    private confirmCopy(name: string, code: string): ConfirmCopy {
        return {
            title: this._translate.instant('configuration.aisle.confirmCreate.title'),
            body: this._translate.instant('configuration.aisle.confirmCreate.body', { name, code }),
            ok: this._translate.instant('configuration.aisle.add'),
            cancel: this._translate.instant('form.confirm.cancel'),
        };
    }

    cancel(): void {
        void this._router.navigateByUrl(AISLE_ROUTES.list);
    }

    private onFailed(error: unknown): void {
        const taken = this._aisles.conflictOf(error);
        if (taken) {
            // The server knows which of the two collided and the form does not. The words are ours,
            // because the server's are English and half the people reading this do not read English.
            this.editor()?.reject(taken);
            this._message.error(this._translate.instant(AISLE_TAKEN[taken]));
            return;
        }
        if (this._aisles.parentRefused(error)) {
            this.editor()?.reject('warehouse_oid');
            this._message.error(this._translate.instant('configuration.aisle.warehouseInactive'));
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }
}
