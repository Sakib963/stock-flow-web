import { CONFIGURATION_ROUTES } from '@app/modules/configuration/configuration.routes';
import { CATEGORY_LIST } from '@app/modules/configuration/config/category-list/category-list.config';
import { isListIcon } from '@app/shared/constants/list-icons';
import en from '../../../../../../public/assets/i18n/en.json';
import bn from '../../../../../../public/assets/i18n/bn.json';

const keyExists = (dictionary: object, key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionary) !== undefined;

describe('the categories list config', () => {
    const table = CATEGORY_LIST.table;
    const statusStyles = table.columns.flatMap((c) => (c.type === 'status' ? Object.values(c.tones) : []));

    it('is plain data, so it could be stored and sent unchanged', () => {
        expect(JSON.parse(JSON.stringify(CATEGORY_LIST))).toEqual(CATEGORY_LIST);
    });

    it('lets exactly one column take the slack', () => {
        expect(table.columns.filter((c) => !c.width).map((c) => c.key)).toEqual(['name']);
    });

    it('is guarded by the same permission it declares', () => {
        const route = CONFIGURATION_ROUTES.find((r) => r.path === 'categories');
        expect(route?.data?.['permission']).toBe(CATEGORY_LIST.permission);
    });

    it('names only icons that are registered', () => {
        const icons = [table.empty.icon, ...statusStyles.map((s) => s.icon)];
        expect(icons.filter((icon) => icon && !isListIcon(icon))).toEqual([]);
    });

    it('has every label in both languages', () => {
        const keys = [...table.columns.map((c) => c.label), table.empty.title, table.empty.body, ...statusStyles.map((s) => s.label)].filter((k): k is string => typeof k === 'string');
        expect(keys.filter((k) => !keyExists(en, k))).toEqual([]);
        expect(keys.filter((k) => !keyExists(bn, k))).toEqual([]);
    });
});
