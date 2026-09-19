import { fillRoute } from '@app/shared/utils/fill-route/fill-route';

describe('fillRoute', () => {
    it('opens the record the row belongs to', () => {
        expect(fillRoute('/app/sales/orders/:oid', { oid: 'o-42' })).toBe('/app/sales/orders/o-42');
    });

    it('refuses a route it cannot complete rather than opening the wrong page', () => {
        expect(fillRoute('/app/sales/orders/:oid', { invoice_no: 'INV-1' })).toBeNull();
    });

    it('leaves a route with no fields alone', () => {
        expect(fillRoute('/app/sales/pos')).toBe('/app/sales/pos');
    });
});
