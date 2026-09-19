import { MenuItem } from '@app/core/models/session.model';
import { findMenuPath } from '@app/shared/utils/menu-path/menu-path';

const item = (id: string, route: string | null, children: MenuItem[] = []): MenuItem => ({
    id,
    label: { en: id, bn: id },
    description: { en: null, bn: null },
    tags: [],
    icon: null,
    order: 0,
    route,
    permission: null,
    isDisabled: false,
    disabledMessage: { en: null, bn: null },
    isNew: false,
    children,
});

const MENU = [item('dashboard', '/app/dashboard'), item('configuration', null, [item('categories', '/app/configuration/categories'), item('sub-categories', '/app/configuration/sub-categories')])];

describe('findMenuPath', () => {
    it('walks from the group down to the page being shown', () => {
        expect(findMenuPath(MENU, '/app/configuration/categories?page=2').map((i) => i.id)).toEqual(['configuration', 'categories']);
    });

    it('keeps a record page under its list', () => {
        expect(findMenuPath(MENU, '/app/configuration/categories/42').map((i) => i.id)).toEqual(['configuration', 'categories']);
    });

    it('does not mistake a route for another that merely starts with the same letters', () => {
        expect(findMenuPath(MENU, '/app/configuration/sub-categories').map((i) => i.id)).toEqual(['configuration', 'sub-categories']);
    });

    it('finds nothing for a page the menu does not list', () => {
        expect(findMenuPath(MENU, '/app/unknown')).toEqual([]);
    });
});
