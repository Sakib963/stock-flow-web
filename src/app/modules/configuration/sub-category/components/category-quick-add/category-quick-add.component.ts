import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ShellStateService } from '@app/layout/services/shell-state/shell-state.service';
import { CategoryFormComponent } from '@app/modules/configuration/category/components/category-form.component';
import { CATEGORY_TAKEN } from '@app/modules/configuration/category/constants/category-copy';
import { CategoryService } from '@app/modules/configuration/category/services/category.service';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

/**
 * Adds a category without leaving the sub-category form.
 *
 * Someone halfway through a sub-category who finds its category missing would otherwise have to
 * abandon what they typed, go and add it, and come back. This is the same category form the
 * Categories page uses, so its checks and its code generator come with it.
 */
@Component({
    selector: 'category-quick-add',
    imports: [NgIcon, NzButtonModule, NzDrawerModule, TranslatePipe, CategoryFormComponent],
    providers: [provideIcons({ lucideCheck, lucideX })],
    templateUrl: './category-quick-add.component.html',
    styleUrl: './category-quick-add.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryQuickAddComponent {
    private readonly _categories = inject(CategoryService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    readonly shell = inject(ShellStateService);

    /** Null while closed; the name to start from while open, empty when nothing was typed. */
    readonly startingName = input<string | null>(null);

    readonly created = output<{ oid: string; name: string }>();
    readonly closed = output<void>();

    readonly editor = viewChild(CategoryFormComponent);
    private readonly _submitting = signal(false);
    readonly saving = computed(() => this._submitting() || this._categories.saving());

    constructor() {
        // The form is built when the drawer opens, so the name someone was searching for is put in
        // once it exists. Typed by them, so leaving it counts as something to lose.
        effect(() => {
            const editor = this.editor();
            if (!editor) return;
            const name = untracked(this.startingName)?.trim();
            if (!name) return;
            editor.form.controls.name.setValue(name);
            editor.form.controls.name.markAsDirty();
        });
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;

        this._submitting.set(true);
        editor.ready().subscribe((ready) => {
            this._submitting.set(false);
            if (!ready) {
                this._message.error(this._translate.instant('form.fixErrors'));
                return;
            }

            const payload = editor.payload();
            const copy = {
                title: this._translate.instant('configuration.category.confirmCreate.title'),
                body: this._translate.instant('configuration.category.confirmCreate.body', { name: payload.name, code: payload.category_code }),
                ok: this._translate.instant('configuration.category.add'),
                cancel: this._translate.instant('form.confirm.cancel'),
            };
            confirmAction(this._modal, copy).subscribe((confirmed) => {
                if (!confirmed) return;
                this._submitting.set(true);
                this._categories.create(payload).subscribe({
                    next: (oid) => {
                        this._submitting.set(false);
                        this._message.success(this._translate.instant('configuration.category.createdMessage'));
                        this.created.emit({ oid, name: payload.name });
                    },
                    error: (error: unknown) => {
                        this._submitting.set(false);
                        const taken = this._categories.conflictOf(error);
                        if (taken) {
                            editor.reject(taken);
                            this._message.error(this._translate.instant(CATEGORY_TAKEN[taken]));
                            return;
                        }
                        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
                    },
                });
            });
        });
    }

    close(): void {
        if (!this.saving()) this.closed.emit();
    }
}
