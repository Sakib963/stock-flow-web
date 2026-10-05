import { SALES_ROUTES } from '@app/modules/sales/sales.routes';
import { CUSTOMER_LIST } from '@app/modules/sales/customer/config/customer-list.config';
import { isListIcon } from '@app/shared/constants/list-icons';
import en from '../../../../../../public/assets/i18n/en.json';
import bn from '../../../../../../public/assets/i18n/bn.json';

const keyExists = (dictionary: object, key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionary) !== undefined;

describe('the customers list config', () => {
    const table = CUSTOMER_LIST.table;

    it('is plain data, so it could be stored and sent unchanged', () => {
        expect(JSON.parse(JSON.stringify(CUSTOMER_LIST))).toEqual(CUSTOMER_LIST);
    });

    it('fills the full width with the columns shown by default', () => {
        expect(table.columns.filter((c) => !c.hidden).reduce((sum, c) => sum + c.width, 0)).toBe(100);
    });

    it('names a permission on every action, so none of them defaults to allowed', () => {
        const actions = [...(CUSTOMER_LIST.header.actions ?? []), ...(table.rowActions ?? [])];
        expect(actions.filter((a) => !a.permission)).toEqual([]);
    });

    it('offers no export, which the list pages leave out', () => {
        expect(CUSTOMER_LIST.header.actions?.map((a) => a.key)).toEqual(['create']);
    });

    it('is guarded by the same permission it declares', () => {
        const route = SALES_ROUTES[0].children?.find((r) => r.path === 'customers');
        expect(route?.data?.['permission']).toBe(CUSTOMER_LIST.permission);
    });

    it('has every label in both languages, and every icon registered', () => {
        const labels = [...table.columns.map((c) => c.label as string), ...(CUSTOMER_LIST.stats ?? []).map((s) => s.label as string), ...(CUSTOMER_LIST.filter?.fields ?? []).flatMap((f) => [f.label as string, ...('choices' in f && Array.isArray(f.choices) ? f.choices.map((c) => c.label as string) : [])])];
        for (const key of labels) {
            expect(keyExists(en, key), `en ${key}`).toBe(true);
            expect(keyExists(bn, key), `bn ${key}`).toBe(true);
        }
        const icons = [...(CUSTOMER_LIST.stats ?? []).map((s) => s.icon), ...(table.rowActions ?? []).map((a) => a.icon), ...(CUSTOMER_LIST.header.actions ?? []).map((a) => a.icon), table.empty?.icon];
        expect(icons.filter((icon) => !isListIcon(icon))).toEqual([]);
    });
});
