import { STOCK_ADJUSTMENT_LIST } from './stock-adjustment-list.config';

const table = STOCK_ADJUSTMENT_LIST.table;

describe('the stock adjustments list config', () => {
    it('is closed without the view permission and offers New adjustment only to those allowed, with no list download (a report covers it)', () => {
        expect(STOCK_ADJUSTMENT_LIST.permission).toBe('inventory.stock-adjustment.view');
        const actions = STOCK_ADJUSTMENT_LIST.header.actions ?? [];
        expect(actions.map((a) => [a.key, a.permission])).toEqual([
            ['create', 'inventory.stock-adjustment.create'],
        ]);
    });

    it('draws values at cost only for someone who may see money', () => {
        const money = table.columns.filter((c) => c.type === 'money');
        expect(money.map((c) => c.key)).toEqual(['value_in', 'value_out']);
        expect(money.every((c) => c.permission === 'inventory.stock-value.view')).toBe(true);
    });

    it('never verifies from the list: its Submitted row opens the record, where the lines are read first', () => {
        const actions = table.rowActions ?? [];
        expect(actions.every((a) => a.run.kind === 'navigate')).toBe(true);
        expect(actions.find((a) => a.key === 'open')?.run).toEqual({ kind: 'navigate', route: '/app/inventory/stock-adjustments/:oid' });
    });
});
