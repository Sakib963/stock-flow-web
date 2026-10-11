import { categoryGroups } from './category-groups';

describe('categoryGroups', () => {
    it('puts each product under its category and sub-category, in the order they came', () => {
        const groups = categoryGroups([
            { oid: 'a', category_name: 'Skincare', sub_category_name: 'Serum' },
            { oid: 'b', category_name: 'Skincare', sub_category_name: 'Serum' },
            { oid: 'c', category_name: 'Haircare', sub_category_name: 'Shampoo' },
        ]);
        expect(groups.map((g) => [g.label, g.rows.map((r) => r.oid)])).toEqual([
            ['Skincare / Serum', ['a', 'b']],
            ['Haircare / Shampoo', ['c']],
        ]);
    });

    it('lists a product with no category first, without a heading', () => {
        const groups = categoryGroups([{ oid: 'a', category_name: 'Skincare', sub_category_name: 'Serum' }, { oid: 'own' }]);
        expect(groups[0]).toEqual({ label: '', rows: [{ oid: 'own' }] });
    });
});
