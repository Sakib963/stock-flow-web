import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmCopy } from '@app/core/models/form.model';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { ProductFormComponent } from '@app/modules/configuration/product/components/product-form/product-form.component';
import { ProductService } from '@app/modules/configuration/product/services/product.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';
import { PageBack } from '@app/core/models/page-header.model';
import { PRODUCT_ROUTES } from '@app/modules/configuration/product/constants/product-routes';
import { PRODUCT_REFUSED } from '@app/modules/configuration/product/constants/product-copy';

/** Adding a product. The form is the shared component; this page saves it and says where to go. */
@Component({
    selector: 'product-create',
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, ProductFormComponent],
    templateUrl: './product-create.component.html',
    styleUrl: './product-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _products = inject(ProductService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    readonly back: PageBack = { route: PRODUCT_ROUTES.list };
    readonly editor = viewChild(ProductFormComponent);
    // Set the moment Save is pressed, because the form may still be waiting on an availability
    // check and the request has not started yet. Without it a second press starts a second wait.
    private readonly _submitting = signal(false);

    readonly saving = computed(() => this._submitting() || this._products.saving());

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
                this._products.create(payload).subscribe({
                    next: (oid) => {
                        this._submitting.set(false);
                        editor.form.markAsPristine();
                        this._message.success(this._translate.instant('configuration.product.createdMessage'));
                        void this._router.navigateByUrl(PRODUCT_ROUTES.detail(oid));
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
            title: this._translate.instant('configuration.product.confirmCreate.title'),
            body: this._translate.instant('configuration.product.confirmCreate.body', { name }),
            ok: this._translate.instant('configuration.product.add'),
            cancel: this._translate.instant('form.confirm.cancel'),
        };
    }

    cancel(): void {
        void this._router.navigateByUrl(PRODUCT_ROUTES.list);
    }

    private onFailed(error: unknown): void {
        const taken = this._products.conflictOf(error);
        if (taken) {
            // The server names the field and says the rest in English; the words here are in both languages.
            this.editor()?.reject(taken);
            this._message.error(this._translate.instant(PRODUCT_REFUSED[taken]));
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }
}
