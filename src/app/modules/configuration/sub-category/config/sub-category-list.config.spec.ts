import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SUB_CATEGORY_LIST } from './sub-category-list.config';

describe('SUB_CATEGORY_LIST', () => {
    it('filters by status and by category', () => {
        expect(SUB_CATEGORY_LIST.filter?.fields.map((field) => field.key)).toEqual(['status', 'category_oid']);
    });

    it('loads the categories from the dropdown endpoint', () => {
        const category = SUB_CATEGORY_LIST.filter!.fields[1];
        expect('choices' in category && category.choices).toEqual({ endpoint: APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN });
    });

    it('shows which category each row belongs to', () => {
        expect(SUB_CATEGORY_LIST.table.columns.map((column) => column.key)).toContain('category_name');
    });

    it('fills the full width with the columns shown by default', () => {
        expect(SUB_CATEGORY_LIST.table.columns.filter((c) => !c.hidden).reduce((sum, c) => sum + c.width, 0)).toBe(100);
    });

    it('offers the description in Columns, off until someone picks it', () => {
        const description = SUB_CATEGORY_LIST.table.columns.find((column) => column.key === 'description');
        expect(description).toMatchObject({ type: 'long-text', hidden: true });
        expect(description?.locked).toBeFalsy();
    });

    it('gates every action on a sub-category permission', () => {
        const codes = [SUB_CATEGORY_LIST.permission, ...(SUB_CATEGORY_LIST.header?.actions ?? []).map((a) => a.permission), ...(SUB_CATEGORY_LIST.table.rowActions ?? []).map((a) => a.permission)];
        expect(codes.every((code) => code?.startsWith('configuration.sub-category.'))).toBe(true);
    });
});
