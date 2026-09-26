import { Column, TablePreferences } from '@app/core/models/table.model';
import { mergeOrder, mergePreferences, moveColumn, orderedColumns, visibleColumns } from '@app/shared/utils/column-order/column-order';

const column = (key: string, extra: Partial<Column> = {}): Column => ({ key, label: key, type: 'text', ...extra }) as Column;

const COLUMNS: Column[] = [column('code', { pin: 'start', locked: true }), column('name', { locked: true }), column('supplier'), column('stock'), column('status'), column('actions', { pin: 'end' })];

const keys = (columns: readonly Column[]) => columns.map((c) => c.key);

describe('mergeOrder', () => {
    it('keeps the order someone chose', () => {
        expect(mergeOrder(COLUMNS, ['status', 'name', 'stock', 'supplier', 'code', 'actions'])).toEqual(['status', 'name', 'stock', 'supplier', 'code', 'actions']);
    });

    it('falls back to the config order when nothing is stored', () => {
        expect(mergeOrder(COLUMNS, undefined)).toEqual(['code', 'name', 'supplier', 'stock', 'status', 'actions']);
    });

    it('drops a column that no longer exists rather than leaving a hole', () => {
        expect(mergeOrder(COLUMNS, ['cost_price', 'name', 'code', 'supplier', 'stock', 'status', 'actions'])).toEqual(['name', 'code', 'supplier', 'stock', 'status', 'actions']);
    });

    it('drops a duplicate key, so a column cannot be drawn twice', () => {
        expect(mergeOrder(COLUMNS, ['name', 'name', 'code', 'supplier', 'stock', 'status', 'actions'])).toEqual(['name', 'code', 'supplier', 'stock', 'status', 'actions']);
    });

    it('puts a column added since after the one before it in the config, not at the far right', () => {
        // 'stock' is new. In the config it sits after 'supplier', so that is where it appears.
        const order = mergeOrder(COLUMNS, ['status', 'supplier', 'name', 'code', 'actions']);

        expect(order.indexOf('stock')).toBe(order.indexOf('supplier') + 1);
        expect(order.at(-1)).not.toBe('stock');
    });

    it('keeps two new neighbours in their config order', () => {
        const order = mergeOrder(COLUMNS, ['code', 'name', 'actions']);

        expect(order).toEqual(['code', 'name', 'supplier', 'stock', 'status', 'actions']);
    });

    it('puts a new first column at the front, where the config has it', () => {
        const order = mergeOrder(COLUMNS, ['name', 'supplier', 'stock', 'status', 'actions']);

        expect(order[0]).toBe('code');
    });
});

describe('orderedColumns', () => {
    it('holds a pinned column at its edge however the order reads', () => {
        const order = ['status', 'actions', 'stock', 'code', 'supplier', 'name'];

        expect(keys(orderedColumns(COLUMNS, order))).toEqual(['code', 'status', 'stock', 'supplier', 'name', 'actions']);
    });

    it('leaves a column the order never mentions at the end, in its config order', () => {
        expect(keys(orderedColumns(COLUMNS, ['status', 'stock']))).toEqual(['code', 'status', 'stock', 'name', 'supplier', 'actions']);
    });
});

describe('visibleColumns', () => {
    const prefs = (over: Partial<TablePreferences> = {}): TablePreferences => ({ layout: 'table', order: ['code', 'name', 'supplier', 'stock', 'status', 'actions'], hidden: [], ...over });

    it('leaves out what was hidden', () => {
        expect(keys(visibleColumns(COLUMNS, prefs({ hidden: ['supplier', 'stock'] })))).toEqual(['code', 'name', 'status', 'actions']);
    });

    it('refuses to hide a locked column, so the row never loses what identifies it', () => {
        expect(keys(visibleColumns(COLUMNS, prefs({ hidden: ['code', 'name'] })))).toEqual(['code', 'name', 'supplier', 'stock', 'status', 'actions']);
    });
});

describe('moveColumn', () => {
    const ORDER = ['code', 'name', 'supplier', 'stock', 'status', 'actions'];
    // Movable, in order: name, supplier, stock, status.

    it('moves a column later and shifts the rest back', () => {
        const moved = moveColumn(COLUMNS, ORDER, 0, 2);

        expect(keys(orderedColumns(COLUMNS, moved))).toEqual(['code', 'supplier', 'stock', 'name', 'status', 'actions']);
    });

    it('moves a column earlier', () => {
        const moved = moveColumn(COLUMNS, ORDER, 3, 0);

        expect(keys(orderedColumns(COLUMNS, moved))).toEqual(['code', 'status', 'name', 'supplier', 'stock', 'actions']);
    });

    it('cannot drop a column past a pinned one at either edge', () => {
        // 3 is the last movable position. Asking for a further one is refused rather than clamped
        // into the pinned column's place.
        expect(moveColumn(COLUMNS, ORDER, 0, 4)).toEqual(ORDER);
        expect(moveColumn(COLUMNS, ORDER, 0, -1)).toEqual(ORDER);
    });

    it('is a no-op when a drag ends where it started', () => {
        expect(moveColumn(COLUMNS, ORDER, 2, 2)).toEqual(ORDER);
    });

    it('keeps every column in the order it returns, pinned ones included', () => {
        expect([...moveColumn(COLUMNS, ORDER, 0, 3)].sort()).toEqual([...ORDER].sort());
    });
});

describe('mergePreferences', () => {
    const fallback = { layout: 'table' as const };

    it('starts from the config when nothing is stored, hiding the columns the config hides', () => {
        const columns = [...COLUMNS, column('cost', { hidden: true })];

        expect(mergePreferences(columns, ['table'], null, fallback)).toEqual({ layout: 'table', order: ['code', 'name', 'supplier', 'stock', 'status', 'actions', 'cost'], hidden: ['cost'] });
    });

    it('falls back to the config layout when the stored one is gone', () => {
        expect(mergePreferences(COLUMNS, ['table'], { layout: 'board' }, fallback).layout).toBe('table');
    });

    it('keeps a stored layout the config still offers', () => {
        expect(mergePreferences(COLUMNS, ['table', 'cards'], { layout: 'cards' }, fallback).layout).toBe('cards');
    });

    it('ignores a density that is not one of the two', () => {
    });

    it('stops hiding a column that has been locked since', () => {
        expect(mergePreferences(COLUMNS, ['table'], { hidden: ['name', 'supplier'] }, fallback).hidden).toEqual(['supplier']);
    });

    it('keeps a column added to the config since hidden, when the config hides it', () => {
        const columns = [...COLUMNS, column('description', { hidden: true })];
        const stored = { order: keys(COLUMNS), hidden: ['supplier'] };

        expect(mergePreferences(columns, ['table'], stored, fallback).hidden).toEqual(['supplier', 'description']);
    });

    it('keeps showing a hidden-by-default column someone picked', () => {
        const columns = [...COLUMNS, column('description', { hidden: true })];
        const stored = { order: keys(columns), hidden: [] };

        expect(mergePreferences(columns, ['table'], stored, fallback).hidden).toEqual([]);
    });

    it('drops a hidden key for a column that no longer exists', () => {
        expect(mergePreferences(COLUMNS, ['table'], { hidden: ['cost_price', 'supplier'] }, fallback).hidden).toEqual(['supplier']);
    });
});
