import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { GrantAction } from '@app/core/models/role.model';
import { RoleWarning } from '@app/modules/administration/role/components/role-warning/role-warning.component';
import { RoleSave, askBeforeSaving } from './ask-before-saving';

const action = (code: string, is_sensitive = false): GrantAction => {
    const [module, feature, verb] = code.split('.');
    return { code, module, feature, action: verb, label: feature, label_bn: feature, is_sensitive };
};
const holder = (email: string) => ({ oid: email, name: email, email, status: 'Active' });

const ask = (save: Partial<RoleSave>) => {
    const modal = { create: vi.fn(() => ({ afterClose: of(true) })), confirm: vi.fn(() => ({ afterClose: of(true) })) };
    const translate = { instant: (key: string) => key } as unknown as TranslateService;
    askBeforeSaving(modal as unknown as NzModalService, translate, 'en', { name: 'Counter', isNew: false, holders: [], added: [], removed: [], editor: 'me@x.test', ...save }).subscribe();
    const warned = modal.create.mock.calls[0] as unknown as [{ nzData: RoleWarning }] | undefined;
    return { modal, warning: warned?.[0].nzData };
};

describe('the question before a role is saved', () => {
    it('warns about a sensitive action even on a role nobody holds', () => {
        const { warning, modal } = ask({ isNew: true, added: [action('sales.analytics.view', true), action('sales.order.view')] });
        expect(modal.confirm).not.toHaveBeenCalled();
        expect(warning!.sensitive.map((a) => a.code)).toEqual(['sales.analytics.view']);
        expect(warning!.holders).toEqual([]);
    });

    it('names the people a change of access reaches', () => {
        const { warning } = ask({ holders: [holder('a@x.test'), holder('b@x.test')], removed: [action('sales.order.refund')] });
        expect(warning!.holders.map((h) => h.email)).toEqual(['a@x.test', 'b@x.test']);
        expect(warning!.selfLoses).toBe(false);
    });

    it('warns the editor first when they hold the role and lose something', () => {
        const { warning } = ask({ holders: [holder('me@x.test')], removed: [action('sales.order.refund')] });
        expect(warning!.selfLoses).toBe(true);
    });

    it('asks the ordinary question for a rename, or for grants nobody holds with nothing sensitive', () => {
        expect(ask({ holders: [holder('a@x.test')] }).modal.confirm).toHaveBeenCalled();
        expect(ask({ added: [action('sales.order.view')] }).modal.confirm).toHaveBeenCalled();
    });
});
