import { INVENTORY_ROUTES } from '@app/modules/inventory/inventory.routes';
import { PAYMENT_STATUS, PURCHASE_ORDER_LIST } from '@app/modules/inventory/purchase-order/config/purchase-order-list.config';
import { isListIcon } from '@app/shared/constants/list-icons';
import en from '../../../../../../public/assets/i18n/en.json';
import bn from '../../../../../../public/assets/i18n/bn.json';

const keyExists = (dictionary: object, key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionary) !== undefined;

describe('the purchase orders list config', () => {
    const table = PURCHASE_ORDER_LIST.table;
    const statusStyles = [...table.columns.flatMap((c) => (c.type === 'status' ? Object.values(c.tones) : [])), ...Object.values(PAYMENT_STATUS)];
    const routes = INVENTORY_ROUTES.flatMap((route) => route.children ?? [route]);

    it('is plain data, so it could be stored and sent unchanged', () => {
        expect(JSON.parse(JSON.stringify(PURCHASE_ORDER_LIST))).toEqual(PURCHASE_ORDER_LIST);
    });

    it('fills the full width with the columns shown by default', () => {
        expect(table.columns.filter((c) => !c.hidden).reduce((sum, c) => sum + c.width, 0)).toBe(100);
    });

    it('offers edit and verify only on an order still waiting for its delivery', () => {
        const gated = (table.rowActions ?? []).filter((a) => a.key !== 'view');
        expect(gated.map((a) => a.when)).toEqual([
            { field: 'status', in: ['Submitted'] },
            { field: 'status', in: ['Submitted'] },
        ]);
    });

    it('names the permission each action needs, verify being approval', () => {
        const actions = [...(PURCHASE_ORDER_LIST.header.actions ?? []), ...(table.rowActions ?? [])];
        expect(actions.filter((a) => !a.permission)).toEqual([]);
        expect(actions.find((a) => a.key === 'verify')?.permission).toBe('inventory.purchase-order.approve');
    });

    it('is guarded by the same permission it declares', () => {
        expect(routes.find((r) => r.path === 'purchase-orders')?.data?.['permission']).toBe(PURCHASE_ORDER_LIST.permission);
    });

    it('routes every action somewhere the module actually declares', () => {
        const declared = routes.map((r) => `/app/inventory/${r.path}`);
        const targets = [...(PURCHASE_ORDER_LIST.header.actions ?? []), ...(table.rowActions ?? [])].map((a) => (a.run.kind === 'navigate' ? a.run.route : null)).filter((route): route is string => !!route);

        expect(targets.length).toBe(4);
        expect(targets.filter((route) => !declared.includes(route))).toEqual([]);
    });

    it('names only icons that are registered', () => {
        const icons = [table.empty.icon, ...statusStyles.map((s) => s.icon), ...(PURCHASE_ORDER_LIST.stats ?? []).map((s) => s.icon), ...(PURCHASE_ORDER_LIST.header.actions ?? []).map((a) => a.icon), ...(table.rowActions ?? []).map((a) => a.icon)];
        expect(icons.filter((icon) => icon && !isListIcon(icon))).toEqual([]);
    });

    it('has every label in both languages', () => {
        const choiceLabels = (PURCHASE_ORDER_LIST.filter?.fields ?? []).flatMap((f) => ('choices' in f && Array.isArray(f.choices) ? f.choices.map((c) => c.label) : []));
        const keys = [...table.columns.map((c) => c.label), table.empty.title, table.empty.body, ...statusStyles.map((s) => s.label), ...(PURCHASE_ORDER_LIST.stats ?? []).map((s) => s.label), ...(PURCHASE_ORDER_LIST.header.actions ?? []).map((a) => a.label), ...(table.rowActions ?? []).map((a) => a.label), ...(PURCHASE_ORDER_LIST.filter?.fields ?? []).map((f) => f.label), ...(PURCHASE_ORDER_LIST.filter?.search ? [PURCHASE_ORDER_LIST.filter.search.placeholder] : []), ...choiceLabels].filter(
            (k): k is string => typeof k === 'string'
        );
        expect(keys.filter((k) => !keyExists(en, k))).toEqual([]);
        expect(keys.filter((k) => !keyExists(bn, k))).toEqual([]);
    });
});
