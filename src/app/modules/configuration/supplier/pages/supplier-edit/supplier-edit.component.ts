import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { Supplier } from '@app/core/models/supplier.model';
import { ConfirmCopy } from '@app/core/models/form.model';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { SupplierFormComponent } from '@app/modules/configuration/supplier/components/supplier-form.component';
import { PageBack } from '@app/core/models/page-header.model';
import { SUPPLIER_ROUTES } from '@app/modules/configuration/supplier/constants/supplier-routes';
import { SUPPLIER_TAKEN } from '@app/modules/configuration/supplier/constants/supplier-copy';
import { SupplierService } from '@app/modules/configuration/supplier/services/supplier.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

/** Editing a supplier: load it, hand it to the form, save what comes back. */
@Component({
    selector: 'supplier-edit',
    imports: [NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, SupplierFormComponent],
    templateUrl: './supplier-edit.component.html',
    styleUrl: './supplier-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _suppliers = inject(SupplierService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    private readonly _oid = this._route.snapshot.paramMap.get('oid') ?? '';

    readonly back: PageBack = { route: SUPPLIER_ROUTES.list };
    readonly editor = viewChild(SupplierFormComponent);
    // Set the moment Save is pressed, because the form may still be waiting on an availability
    // check and the request has not started yet. Without it a second press starts a second wait.
    private readonly _submitting = signal(false);

    readonly saving = computed(() => this._submitting() || this._suppliers.saving());
    readonly supplier = signal<Supplier | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._suppliers.details(this._oid).subscribe({
            next: ({ details }) => {
                this.supplier.set(details);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.form.dirty;
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.form.dirty) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }

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
                this._suppliers.update(payload).subscribe({
                    next: (changed) => {
                        this._submitting.set(false);
                        editor.form.markAsPristine();
                        if (changed) this._message.success(this._translate.instant('configuration.supplier.updated'));
                        else this._message.info(this._translate.instant('form.nothingChanged'));
                        void this._router.navigateByUrl(SUPPLIER_ROUTES.detail(this._oid));
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
            title: this._translate.instant('configuration.supplier.confirmEdit.title'),
            body: this._translate.instant('configuration.supplier.confirmEdit.body', { name }),
            ok: this._translate.instant('form.saveChanges'),
            cancel: this._translate.instant('form.confirm.cancel'),
        };
    }

    cancel(): void {
        void this._router.navigateByUrl(SUPPLIER_ROUTES.detail(this._oid));
    }

    backToList(): void {
        void this._router.navigateByUrl(SUPPLIER_ROUTES.list);
    }

    private onFailed(error: unknown): void {
        const taken = this._suppliers.conflictOf(error);
        if (taken) {
            this.editor()?.reject(taken);
            this._message.error(this._translate.instant(SUPPLIER_TAKEN[taken]));
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }
}
