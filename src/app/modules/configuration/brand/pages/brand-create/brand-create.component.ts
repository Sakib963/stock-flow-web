import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmCopy } from '@app/core/models/form.model';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { BrandFormComponent } from '@app/modules/configuration/brand/components/brand-form.component';
import { BrandService } from '@app/modules/configuration/brand/services/brand.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';
import { PageBack } from '@app/core/models/page-header.model';
import { BRAND_ROUTES } from '@app/modules/configuration/brand/constants/brand-routes';
import { BRAND_TAKEN } from '@app/modules/configuration/brand/constants/brand-copy';

/** Adding a brand. The form is the shared component; this page saves it and says where to go. */
@Component({
    selector: 'brand-create',
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, BrandFormComponent],
    templateUrl: './brand-create.component.html',
    styleUrl: './brand-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _brands = inject(BrandService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    readonly back: PageBack = { route: BRAND_ROUTES.list };
    readonly editor = viewChild(BrandFormComponent);
    // Set the moment Save is pressed, because the form may still be waiting on an availability
    // check and the request has not started yet. Without it a second press starts a second wait.
    private readonly _submitting = signal(false);

    readonly saving = computed(() => this._submitting() || this._brands.saving());

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
            confirmAction(this._modal, this.confirmCopy(payload.name)).subscribe((confirmed) => {
                if (!confirmed) return;
                this._submitting.set(true);
                this._brands.create(payload).subscribe({
                    next: (oid) => {
                        this._submitting.set(false);
                        editor.form.markAsPristine();
                        this._message.success(this._translate.instant('configuration.brand.createdMessage'));
                        void this._router.navigateByUrl(BRAND_ROUTES.detail(oid));
                    },
                    error: (error: unknown) => {
                        this._submitting.set(false);
                        this.onFailed(error);
                    },
                });
            });
        });
    }

    private confirmCopy(name: string): ConfirmCopy {
        return {
            title: this._translate.instant('configuration.brand.confirmCreate.title'),
            body: this._translate.instant('configuration.brand.confirmCreate.body', { name }),
            ok: this._translate.instant('configuration.brand.add'),
            cancel: this._translate.instant('form.confirm.cancel'),
        };
    }

    cancel(): void {
        void this._router.navigateByUrl(BRAND_ROUTES.list);
    }

    private onFailed(error: unknown): void {
        const taken = this._brands.conflictOf(error);
        if (taken) {
            this.editor()?.reject(taken);
            this._message.error(this._translate.instant(BRAND_TAKEN[taken]));
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }
}
