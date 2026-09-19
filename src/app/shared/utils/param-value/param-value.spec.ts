import { resolveParams } from '@app/shared/utils/param-value/param-value';

describe('resolveParams', () => {
    it('sends a supplier table the supplier its page is showing', () => {
        expect(resolveParams({ supplier_oid: { context: 'oid' }, status: 'Active' }, { context: { oid: 's-1' } })).toEqual({ supplier_oid: 's-1', status: 'Active' });
    });

    it('reads the route, another filter and the row', () => {
        const params = { a: { route: 'oid' }, b: { filter: 'category' }, c: { row: 'invoice_no' }, d: 3, e: false };

        expect(resolveParams(params, { route: { oid: 'r-1' }, filters: { category: '7' }, row: { invoice_no: 'INV-1' } })).toEqual({ a: 'r-1', b: '7', c: 'INV-1', d: 3, e: false });
    });

    it('leaves out a reference with nothing behind it instead of sending an empty value', () => {
        expect(resolveParams({ category_oid: { filter: 'category' } }, { filters: { category: null } })).toEqual({});
    });
});
