import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { CategoryFormComponent } from '@app/modules/configuration/components/category-form/category-form.component';
import { CategoryService } from '@app/modules/configuration/services/category.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';
import { PageBack } from '@app/core/models/page-header.model';
import { CATEGORY_ROUTES } from '@app/modules/configuration/constants/category-routes';

/** Adding a category. The form is the shared component; this page saves it and says where to go. */
@Component({
    selector: 'category-create',
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, CategoryFormComponent],
    templateUrl: './category-create.component.html',
    styleUrl: './category-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _categories = inject(CategoryService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    readonly back: PageBack = { route: CATEGORY_ROUTES.list };
    readonly editor = viewChild(CategoryFormComponent);
    // Set the moment Save is pressed, because the form may still be waiting on an availability
    // check and the request has not started yet. Without it a second press starts a second wait.
    private readonly _submitting = signal(false);

    readonly saving = computed(() => this._submitting() || this._categories.saving());

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

            this._categories.create(editor.payload()).subscribe({
                next: (oid) => {
                    this._submitting.set(false);
                    editor.form.markAsPristine();
                    this._message.success(this._translate.instant('configuration.category.createdMessage'));
                    void this._router.navigateByUrl(CATEGORY_ROUTES.detail(oid));
                },
                error: (error: unknown) => {
                    this._submitting.set(false);
                    this.onFailed(error);
                },
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(CATEGORY_ROUTES.list);
    }

    private onFailed(error: unknown): void {
        const conflict = this._categories.conflictOf(error);
        if (conflict) {
            // The server's own words: it knows which of the two collided and the form does not.
            this.editor()?.reject(conflict.field, conflict.message);
            this._message.error(conflict.message);
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }
}
