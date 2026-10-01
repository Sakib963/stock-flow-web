import { DISPOSAL_LIST } from './disposal-list.config';

const table = DISPOSAL_LIST.table;

describe('the disposals list config', () => {
    it('is closed without the view permission and offers New disposal only to those allowed, with no list download (a report covers it)', () => {
        expect(DISPOSAL_LIST.permission).toBe('inventory.product-dispose.view');
        const actions = DISPOSAL_LIST.header.actions ?? [];
        expect(actions.map((a) => [a.key, a.permission])).toEqual([
            ['create', 'inventory.product-dispose.create'],
        ]);
    });

    it('draws values at cost only for someone who may see money', () => {
        const money = table.columns.filter((c) => c.type === 'money');
        expect(money.map((c) => c.key)).toEqual(['value']);
        expect(money.every((c) => c.permission === 'inventory.stock-value.view')).toBe(true);
    });

    it('never approves from the list: its Submitted row opens the record, where the lines are read first', () => {
        const actions = table.rowActions ?? [];
        expect(actions.every((a) => a.run.kind === 'navigate')).toBe(true);
        expect(actions.find((a) => a.key === 'open')?.run).toEqual({ kind: 'navigate', route: '/app/inventory/disposals/:oid' });
    });
});
