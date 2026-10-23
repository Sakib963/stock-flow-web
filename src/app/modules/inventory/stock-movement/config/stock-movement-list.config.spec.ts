import { INVENTORY_ROUTES } from '@app/modules/inventory/inventory.routes';
import { STOCK_MOVEMENT_LIST } from '@app/modules/inventory/stock-movement/config/stock-movement-list.config';
import { isListIcon } from '@app/shared/constants/list-icons';
import en from '../../../../../../public/assets/i18n/en.json';
import bn from '../../../../../../public/assets/i18n/bn.json';

const keyExists = (dictionary: object, key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionary) !== undefined;

describe('the stock movements list config', () => {
    const table = STOCK_MOVEMENT_LIST.table;
    const statusStyles = table.columns.flatMap((c) => (c.type === 'status' ? Object.values(c.tones) : []));
    const routes = INVENTORY_ROUTES.flatMap((route) => route.children ?? [route]);

    it('is plain data, so it could be stored and sent unchanged', () => {
        expect(JSON.parse(JSON.stringify(STOCK_MOVEMENT_LIST))).toEqual(STOCK_MOVEMENT_LIST);
    });

    it('fills the full width with the columns shown by default', () => {
        expect(table.columns.filter((c) => !c.hidden).reduce((sum, c) => sum + c.width, 0)).toBe(100);
    });

    it('offers nothing to open or change: no row click, no row actions, no header action', () => {
        expect(table.open).toBeUndefined();
        expect(table.rowActions).toBeUndefined();
        expect(STOCK_MOVEMENT_LIST.header.actions).toBeUndefined();
    });

    it('shows a movement as a signed change, and names its reason for every reason the server writes', () => {
        expect(table.columns.find((c) => c.key === 'quantity')).toEqual(expect.objectContaining({ type: 'number', signed: true }));
        const reasons = table.columns.find((c) => c.type === 'status');
        expect(Object.keys(reasons?.type === 'status' ? reasons.tones : {})).toEqual(['carried_over', 'received', 'sold', 'dispatched', 'returned', 'disposed', 'dispose_reversed', 'given_away', 'adjusted', 'opening_stock']);
    });

    it('links every kind of document behind a movement to its own record page, each behind the permission that opens it', () => {
        const link = table.columns.find((c) => c.type === 'link');
        const route = link?.type === 'link' ? link.route : null;
        expect(typeof route === 'object' && route?.by).toBe('reference_kind');
        const documents = typeof route === 'object' && route ? route.routes : {};
        expect(Object.keys(documents)).toEqual(['purchase-order', 'order', 'return', 'disposal', 'adjustment', 'giveaway']);
        expect(documents['purchase-order']).toEqual({ route: '/app/inventory/purchase-orders/:reference_oid', permission: 'inventory.purchase-order.view' });
        expect(documents['order']).toEqual({ route: '/app/sales/orders/:reference_oid', permission: 'sales.order.view' });
        expect(routes.some((r) => r.path === 'purchase-orders/:oid')).toBe(true);
    });

    it('filters by product for someone who may read the product names', () => {
        const product = STOCK_MOVEMENT_LIST.filter?.fields.find((f) => f.key === 'product_oid');
        expect(product).toEqual(expect.objectContaining({ type: 'select', permission: 'configuration.product.view' }));
    });

    it('is guarded by the same permission it declares', () => {
        expect(routes.find((r) => r.path === 'stock-movements')?.data?.['permission']).toBe('inventory.stock-movement.view');
        expect(STOCK_MOVEMENT_LIST.permission).toBe('inventory.stock-movement.view');
    });

    it('names only icons that are registered', () => {
        const icons = [table.empty.icon, ...statusStyles.map((s) => s.icon), ...(STOCK_MOVEMENT_LIST.stats ?? []).map((s) => s.icon)];
        expect(icons.filter((icon) => icon && !isListIcon(icon))).toEqual([]);
    });

    it('has every label in both languages', () => {
        const choiceLabels = (STOCK_MOVEMENT_LIST.filter?.fields ?? []).flatMap((f) => ('choices' in f && Array.isArray(f.choices) ? f.choices.map((c) => c.label) : []));
        const keys = [...table.columns.map((c) => c.label), table.empty.title, table.empty.body, ...statusStyles.map((s) => s.label), ...(STOCK_MOVEMENT_LIST.stats ?? []).map((s) => s.label), ...(STOCK_MOVEMENT_LIST.filter?.fields ?? []).map((f) => f.label), ...(STOCK_MOVEMENT_LIST.filter?.search ? [STOCK_MOVEMENT_LIST.filter.search.placeholder] : []), ...choiceLabels].filter((k): k is string => typeof k === 'string');
        expect(keys.filter((k) => !keyExists(en, k))).toEqual([]);
        expect(keys.filter((k) => !keyExists(bn, k))).toEqual([]);
    });
});
