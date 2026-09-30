import { INVENTORY_ROUTES } from '@app/modules/inventory/inventory.routes';
import { STOCK_OVERVIEW_LIST, STOCK_VALUE } from '@app/modules/inventory/stock-overview/config/stock-overview-list.config';
import { isListIcon } from '@app/shared/constants/list-icons';
import en from '../../../../../../public/assets/i18n/en.json';
import bn from '../../../../../../public/assets/i18n/bn.json';

const keyExists = (dictionary: object, key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionary) !== undefined;

const MONEY = ['stock_value', 'expected_revenue', 'profit_full', 'profit_discounted', 'internal_value', 'expiring_value'];

describe('the stock overview list config', () => {
    const table = STOCK_OVERVIEW_LIST.table;
    const routes = INVENTORY_ROUTES.flatMap((route) => route.children ?? [route]);

    it('is plain data, so it could be stored and sent unchanged', () => {
        expect(JSON.parse(JSON.stringify(STOCK_OVERVIEW_LIST))).toEqual(STOCK_OVERVIEW_LIST);
    });

    it('fills the full width for someone who sees money', () => {
        expect(table.columns.filter((c) => !c.hidden).reduce((sum, c) => sum + c.width, 0)).toBe(100);
    });

    it('draws every money column and figure only for someone holding the stock value permission', () => {
        for (const column of table.columns.filter((c) => MONEY.includes(c.key))) expect(column.permission).toBe(STOCK_VALUE);
        for (const stat of (STOCK_OVERVIEW_LIST.stats ?? []).filter((s) => MONEY.includes(s.key))) expect(stat.permission).toBe(STOCK_VALUE);
    });

    it('offers one row action, View, and no row click', () => {
        expect(table.open).toBeUndefined();
        expect(table.rowActions?.map((a) => a.key)).toEqual(['view']);
    });

    it('is guarded by the permission it declares, and so is the product page', () => {
        expect(routes.find((r) => r.path === 'overview')?.data?.['permission']).toBe('inventory.overview.view');
        expect(routes.find((r) => r.path === 'overview/:oid')?.data?.['permission']).toBe('inventory.overview.view');
    });

    it('names only registered icons, and has every label in both languages', () => {
        const tones = table.columns.flatMap((c) => (c.type === 'status' ? Object.values(c.tones) : []));
        const icons = [table.empty.icon, ...tones.map((t) => t.icon), ...(STOCK_OVERVIEW_LIST.stats ?? []).map((s) => s.icon)];
        expect(icons.filter((icon) => icon && !isListIcon(icon))).toEqual([]);

        const choices = (STOCK_OVERVIEW_LIST.filter?.fields ?? []).flatMap((f) => ('choices' in f && Array.isArray(f.choices) ? f.choices.map((c) => c.label) : []));
        const keys = [...table.columns.map((c) => c.label), table.empty.title, table.empty.body, ...tones.map((t) => t.label), ...(STOCK_OVERVIEW_LIST.stats ?? []).map((s) => s.label), ...(STOCK_OVERVIEW_LIST.filter?.fields ?? []).map((f) => f.label), ...choices, STOCK_OVERVIEW_LIST.filter?.search?.placeholder].filter((k): k is string => typeof k === 'string');
        expect(keys.filter((k) => !keyExists(en, k))).toEqual([]);
        expect(keys.filter((k) => !keyExists(bn, k))).toEqual([]);
    });
});
