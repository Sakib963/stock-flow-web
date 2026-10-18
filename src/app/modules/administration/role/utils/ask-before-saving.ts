import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslateService } from '@ngx-translate/core';
import { Observable, map } from 'rxjs';
import { AppLanguage } from '@app/core/models/language.model';
import { GrantAction, RoleHolder } from '@app/core/models/role.model';
import { RoleWarning, RoleWarningComponent } from '@app/modules/administration/role/components/role-warning/role-warning.component';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';

export interface RoleSave {
    name: string;
    isNew: boolean;
    holders: RoleHolder[];
    added: GrantAction[];
    removed: GrantAction[];
    editor: string | null;
}

/**
 * The question before a role is saved. Gaining a sensitive action, or changing the grants of a role
 * anyone holds, opens the warning naming them; anything else asks the ordinary save question.
 */
export const askBeforeSaving = (modal: NzModalService, translate: TranslateService, language: AppLanguage, save: RoleSave): Observable<boolean> => {
    const t = (key: string, params?: object) => localDigits(translate.instant(key, params), language);
    const sensitive = save.added.filter((a) => a.is_sensitive);
    const grantsChanged = !!(save.added.length || save.removed.length);
    const reaches = grantsChanged ? save.holders : [];

    if (!sensitive.length && !reaches.length) {
        const copy = save.isNew ? 'administration.role.confirmCreate' : 'administration.role.confirmEdit';
        return confirmAction(modal, { title: t(`${copy}.title`), body: translate.instant(`${copy}.body`, { name: save.name }), ok: t(save.isNew ? 'administration.role.add' : 'form.saveChanges'), cancel: t('form.confirm.cancel') });
    }

    const data: RoleWarning = {
        holders: reaches,
        added: save.added,
        removed: save.removed,
        sensitive,
        selfLoses: !!save.removed.length && reaches.some((h) => h.email === save.editor),
        ok: reaches.length ? t('administration.role.warning.okPeople', { count: reaches.length }) : t(save.isNew ? 'administration.role.add' : 'form.saveChanges'),
    };
    return modal
        .create<RoleWarningComponent, RoleWarning, boolean>({
            nzTitle: reaches.length ? t('administration.role.warning.titlePeople', { count: reaches.length }) : t('administration.role.warning.titleSensitive'),
            nzContent: RoleWarningComponent,
            nzData: data,
            nzFooter: null,
            nzCentered: true,
            nzWidth: 560,
        })
        .afterClose.pipe(map((confirmed) => confirmed === true));
};
