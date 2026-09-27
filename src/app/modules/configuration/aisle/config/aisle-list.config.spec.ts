import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { AISLE_LIST } from './aisle-list.config';

describe('AISLE_LIST', () => {
    it('filters by status and by warehouse', () => {
        expect(AISLE_LIST.filter?.fields.map((field) => field.key)).toEqual(['status', 'warehouse_oid']);
    });

    it('loads the warehouses from the dropdown endpoint', () => {
        const warehouse = AISLE_LIST.filter!.fields[1];
        expect('choices' in warehouse && warehouse.choices).toEqual({ endpoint: APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN });
    });

    it('shows which warehouse each row belongs to', () => {
        expect(AISLE_LIST.table.columns.map((column) => column.key)).toContain('warehouse_name');
    });

    it('fills the full width with the columns shown by default', () => {
        expect(AISLE_LIST.table.columns.filter((c) => !c.hidden).reduce((sum, c) => sum + c.width, 0)).toBe(100);
    });

    it('offers the notes in Columns, off until someone picks it', () => {
        const notes = AISLE_LIST.table.columns.find((column) => column.key === 'special_notes');
        expect(notes).toMatchObject({ type: 'long-text', hidden: true });
        expect(notes?.locked).toBeFalsy();
    });

    it('gates every action on an aisle permission', () => {
        const codes = [AISLE_LIST.permission, ...(AISLE_LIST.header?.actions ?? []).map((a) => a.permission), ...(AISLE_LIST.table.rowActions ?? []).map((a) => a.permission)];
        expect(codes.every((code) => code?.startsWith('configuration.aisle.'))).toBe(true);
    });
});
