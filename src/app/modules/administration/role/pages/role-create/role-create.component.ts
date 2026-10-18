import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PageBack } from '@app/core/models/page-header.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { RoleFormComponent } from '@app/modules/administration/role/components/role-form/role-form.component';
import { ROLE_ROUTES } from '@app/modules/administration/role/constants/role-routes';
import { RoleService } from '@app/modules/administration/role/services/role.service';
import { askBeforeSaving } from '@app/modules/administration/role/utils/ask-before-saving';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

@Component({
    selector: 'role-create',
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, RoleFormComponent],
    templateUrl: './role-create.component.html',
    styleUrl: './role-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService).current;
    private readonly _session = inject(SessionService);

    readonly roles = inject(RoleService);
    readonly back: PageBack = { route: ROLE_ROUTES.list };
    readonly editor = viewChild(RoleFormComponent);

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.dirty();
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.roles.saving()) return;
        if (!editor.valid()) {
            this._message.error(this._translate.instant('form.fixErrors'));
            return;
        }
        const payload = editor.payload();
        const { added, removed } = editor.diff();
        askBeforeSaving(this._modal, this._translate, this._language(), { name: payload.name, isNew: true, holders: [], added, removed, editor: this._session.user()?.email ?? null }).subscribe((confirmed) => {
            if (!confirmed) return;
            this.roles.create(payload).subscribe({
                next: (oid) => {
                    editor.form.markAsPristine();
                    editor.reload(payload.codes);
                    this._message.success(this._translate.instant('administration.role.created'));
                    void this._router.navigateByUrl(ROLE_ROUTES.detail(oid));
                },
                error: (error: unknown) => {
                    if (this.roles.conflictOf(error) === 'name') {
                        editor.markNameTaken();
                        this._message.error(this._translate.instant('administration.role.nameTaken'));
                        return;
                    }
                    this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
                },
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(ROLE_ROUTES.list);
    }
}
