import { orderList } from './order-list.config';

describe('orderList', () => {
    const keys = (config: ReturnType<typeof orderList>) => ({ columns: config.table.columns.map((c) => c.key), filters: (config.filter?.fields ?? []).map((f) => f.key) });

    it('shows the channel filter and column only to someone who sells through both', () => {
        expect(keys(orderList({ bothChannels: true, ownFirst: false })).columns).toContain('channel');
        expect(keys(orderList({ bothChannels: false, ownFirst: false })).columns).not.toContain('channel');
        expect(keys(orderList({ bothChannels: false, ownFirst: false })).filters).not.toContain('channel');
    });

    it('opens on their own orders for someone who cannot confirm, and on everyone’s for the rest', () => {
        const mine = (ownFirst: boolean) => orderList({ bothChannels: true, ownFirst }).filter?.fields.find((f) => f.key === 'mine');
        expect(mine(true)?.default).toBe('true');
        expect(mine(false)?.default).toBeUndefined();
    });
});
