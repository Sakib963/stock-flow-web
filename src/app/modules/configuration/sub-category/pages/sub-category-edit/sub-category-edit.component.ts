import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { SubCategory } from '@app/core/models/sub-category.model';
import { ConfirmCopy } from '@app/core/models/form.model';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { SubCategoryFormComponent } from '@app/modules/configuration/sub-category/components/sub-category-form/sub-category-form.component';
import { PageBack } from '@app/core/models/page-header.model';
import { SUB_CATEGORY_ROUTES } from '@app/modules/configuration/sub-category/constants/sub-category-routes';
import { SUB_CATEGORY_TAKEN } from '@app/modules/configuration/sub-category/constants/sub-category-copy';
import { SubCategoryService } from '@app/modules/configuration/sub-category/services/sub-category.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

/** Editing a sub-category: load it, hand it to the form, save what comes back. */
@Component({
    selector: 'sub-category-edit',
    imports: [NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, SubCategoryFormComponent],
    templateUrl: './sub-category-edit.component.html',
    styleUrl: './sub-category-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubCategoryEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _subCategories = inject(SubCategoryService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    private readonly _oid = this._route.snapshot.paramMap.get('oid') ?? '';

    readonly back: PageBack = { route: SUB_CATEGORY_ROUTES.list };
    readonly editor = viewChild(SubCategoryFormComponent);
    // Set the moment Save is pressed, because the form may still be waiting on an availability
    // check and the request has not started yet. Without it a second press starts a second wait.
    private readonly _submitting = signal(false);

    readonly saving = computed(() => this._submitting() || this._subCategories.saving());
    readonly category = signal<SubCategory | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._subCategories.details(this._oid).subscribe({
            next: ({ details }) => {
                this.category.set(details);
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
                this._subCategories.update(payload).subscribe({
                    next: () => {
                        this._submitting.set(false);
                        editor.form.markAsPristine();
                        this._message.success(this._translate.instant('configuration.subCategory.updated'));
                        void this._router.navigateByUrl(SUB_CATEGORY_ROUTES.detail(this._oid));
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
            title: this._translate.instant('configuration.subCategory.confirmEdit.title'),
            body: this._translate.instant('configuration.subCategory.confirmEdit.body', { name }),
            ok: this._translate.instant('form.saveChanges'),
            cancel: this._translate.instant('form.confirm.cancel'),
        };
    }

    cancel(): void {
        void this._router.navigateByUrl(SUB_CATEGORY_ROUTES.detail(this._oid));
    }

    backToList(): void {
        void this._router.navigateByUrl(SUB_CATEGORY_ROUTES.list);
    }

    private onFailed(error: unknown): void {
        const taken = this._subCategories.conflictOf(error);
        if (taken) {
            this.editor()?.reject(taken);
            this._message.error(this._translate.instant(SUB_CATEGORY_TAKEN[taken]));
            return;
        }
        if (this._subCategories.parentRefused(error)) {
            this.editor()?.reject('category_oid');
            this._message.error(this._translate.instant('configuration.subCategory.categoryInactive'));
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }
}
