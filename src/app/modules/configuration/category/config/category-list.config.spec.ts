import { CONFIGURATION_ROUTES } from '@app/modules/configuration/configuration.routes';
import { CATEGORY_LIST } from '@app/modules/configuration/category/config/category-list.config';
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

    it('draws the same table on every size, because there is nothing to switch to', () => {
        expect(table.layouts.map((l) => l.type)).toEqual(['table']);
        expect(table.phoneLayout).toBeUndefined();
    });

    it('lets exactly one column take the slack, and it is the description', () => {
        expect(table.columns.filter((c) => !c.width).map((c) => c.key)).toEqual(['description']);
    });

    it('sorts the person column by when they touched the row, which is what the server offers', () => {
        const person = table.columns.find((c) => c.type === 'user');
        expect(person?.sortKey).toBe('last_action_on');
    });

    it('asks nothing of a row state, because a category has none that closes an action off', () => {
        expect(table.rowActions?.map((a) => a.stateful)).toEqual([false, false]);
    });

    it('names a permission on every action, so none of them defaults to allowed', () => {
        const actions = [...(CATEGORY_LIST.header.actions ?? []), ...(table.rowActions ?? [])];
        expect(actions.filter((a) => !a.permission)).toEqual([]);
    });

    it('is guarded by the same permission it declares', () => {
        // The feature's routes sit under a pathless parent that carries the module's providers.
        const routes = CONFIGURATION_ROUTES.flatMap((route) => route.children ?? [route]);
        expect(routes.find((r) => r.path === 'categories')?.data?.['permission']).toBe(CATEGORY_LIST.permission);
    });

    it('routes every action somewhere the module actually declares', () => {
        const routes = CONFIGURATION_ROUTES.flatMap((route) => route.children ?? [route]);
        const declared = routes.map((r) => `/app/configuration/${r.path}`);
        const targets = [...(CATEGORY_LIST.header.actions ?? []), ...(table.rowActions ?? [])].map((a) => (a.run.kind === 'navigate' ? a.run.route : null)).filter((route): route is string => !!route);

        expect(targets.length).toBe(3);
        expect(targets.filter((route) => !declared.includes(route.replace(':oid', ':oid')))).toEqual([]);
    });

    it('names only icons that are registered', () => {
        const icons = [table.empty.icon, ...statusStyles.map((s) => s.icon), ...(CATEGORY_LIST.header.actions ?? []).map((a) => a.icon), ...(table.rowActions ?? []).map((a) => a.icon)];
        expect(icons.filter((icon) => icon && !isListIcon(icon))).toEqual([]);
    });

    it('has every label in both languages', () => {
        const choiceLabels = (CATEGORY_LIST.filter?.fields ?? []).flatMap((f) => ('choices' in f && Array.isArray(f.choices) ? f.choices.map((c) => c.label) : []));
        const keys = [...table.columns.map((c) => c.label), table.empty.title, table.empty.body, ...statusStyles.map((s) => s.label), ...(CATEGORY_LIST.header.actions ?? []).map((a) => a.label), ...(table.rowActions ?? []).map((a) => a.label), ...(CATEGORY_LIST.filter?.fields ?? []).map((f) => f.label), ...(CATEGORY_LIST.filter?.search ? [CATEGORY_LIST.filter.search.placeholder] : []), ...choiceLabels].filter((k): k is string => typeof k === 'string');
        expect(keys.filter((k) => !keyExists(en, k))).toEqual([]);
        expect(keys.filter((k) => !keyExists(bn, k))).toEqual([]);
    });
});
