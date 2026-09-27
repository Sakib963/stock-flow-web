import { CONFIGURATION_ROUTES } from '@app/modules/configuration/configuration.routes';
import { PRODUCT_LIST } from '@app/modules/configuration/product/config/product-list.config';
import { isListIcon } from '@app/shared/constants/list-icons';
import en from '../../../../../../public/assets/i18n/en.json';
import bn from '../../../../../../public/assets/i18n/bn.json';

const keyExists = (dictionary: object, key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionary) !== undefined;

describe('the products list config', () => {
    const table = PRODUCT_LIST.table;

    it('is plain data, so it could be stored and sent unchanged', () => {
        expect(JSON.parse(JSON.stringify(PRODUCT_LIST))).toEqual(PRODUCT_LIST);
    });

    it('fills the full width with the columns shown by default', () => {
        expect(table.columns.filter((c) => !c.hidden).reduce((sum, c) => sum + c.width, 0)).toBe(100);
    });

    it('shows the photo beside the name and the SKU under it', () => {
        const name = table.columns.find((c) => c.key === 'name');
        expect(name).toEqual(expect.objectContaining({ type: 'name', thumb: 'photo_thumb', sub: 'sku' }));
    });

    it('shows what can be sold against the restock level, sorted the way the server sorts it', () => {
        const stock = table.columns.find((c) => c.key === 'sellable');
        expect(stock).toEqual(expect.objectContaining({ type: 'stock', restockAt: 'restock_threshold', sortKey: 'stock' }));
    });

    it('uses only icons the list has registered', () => {
        const icons = [...(PRODUCT_LIST.stats ?? []).map((s) => s.icon), ...(table.rowActions ?? []).map((a) => a.icon), table.empty.icon];
        expect(icons.filter((icon) => !isListIcon(icon))).toEqual([]);
    });

    it('has every label in both languages', () => {
        const keys = [...(PRODUCT_LIST.stats ?? []).map((s) => s.label), ...table.columns.map((c) => c.label), table.empty.title, table.empty.body, ...(PRODUCT_LIST.filter?.fields ?? []).map((f) => f.label)].filter((k): k is string => typeof k === 'string');
        expect(keys.filter((key) => !keyExists(en, key))).toEqual([]);
        expect(keys.filter((key) => !keyExists(bn, key))).toEqual([]);
    });

    it('guards every product route with the permission for what it does', () => {
        const children = CONFIGURATION_ROUTES[0].children ?? [];
        const permission = (path: string) => children.find((r) => r.path === path)?.data?.['permission'];
        expect(permission('products')).toBe('configuration.product.view');
        expect(permission('products/new')).toBe('configuration.product.create');
        expect(permission('products/:oid/edit')).toBe('configuration.product.edit');
        expect(permission('products/:oid')).toBe('configuration.product.view');
    });
});
