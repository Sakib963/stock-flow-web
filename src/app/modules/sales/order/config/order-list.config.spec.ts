import { orderList } from './order-list.config';

describe('orderList', () => {
    const keys = (config: ReturnType<typeof orderList>) => ({ columns: config.table.columns.map((c) => c.key), filters: (config.filter?.fields ?? []).map((f) => f.key) });

    it('shows the channel filter and column only to someone who sells through both', () => {
        expect(keys(orderList({ scope: 'all', bothChannels: true })).columns).toContain('channel');
        expect(keys(orderList({ scope: 'all', bothChannels: false })).columns).not.toContain('channel');
        expect(keys(orderList({ scope: 'all', bothChannels: false })).filters).not.toContain('channel');
    });

    it('gives Order history its own list and permission, without the cards or who took the order', () => {
        const history = orderList({ scope: 'history', bothChannels: true });
        expect(history.permission).toBe('sales.order-history.view');
        expect(history.stats).toBeUndefined();
        expect(keys(history).columns).not.toContain('created_by');
        expect(keys(orderList({ scope: 'all', bothChannels: true })).columns).toContain('created_by');
    });
});
