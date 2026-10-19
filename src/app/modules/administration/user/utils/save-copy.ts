import { TranslateService } from '@ngx-translate/core';
import { AppLanguage } from '@app/core/models/language.model';
import { ConfirmCopy } from '@app/core/models/form.model';
import { AssignableRole } from '@app/core/models/user.model';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';

/**
 * The question before a user is saved. Giving a role that holds sensitive actions names each of them
 * instead, as Roles does, so nobody hands one out without being told.
 */
export const saveCopy = (translate: TranslateService, language: AppLanguage, { isNew, name, role }: { isNew: boolean; name: string; role: AssignableRole | null }): ConfirmCopy => {
    const t = (key: string, params?: object) => localDigits(translate.instant(key, params), language);
    const kind = isNew ? 'create' : 'edit';
    const ok = t(`administration.user.confirm.${kind}.button`);
    if (role?.sensitive.length) {
        const actions = [...new Set(role.sensitive.map((action) => (language === 'bn' ? action.label_bn || action.label : action.label)))].join(', ');
        return { title: t('administration.user.confirm.sensitive.title', { role: role.name }), body: t('administration.user.confirm.sensitive.body', { name, role: role.name, actions }), ok, cancel: t('form.confirm.cancel'), icon: isNew ? 'lucideUserPlus' : 'lucideCheck' };
    }
    return { title: t(`administration.user.confirm.${kind}.title`), body: t(`administration.user.confirm.${kind}.body`, { name }), ok, cancel: t('form.confirm.cancel'), icon: isNew ? 'lucideUserPlus' : 'lucideCheck' };
};
