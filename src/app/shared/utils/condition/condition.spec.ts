import { matches } from '@app/shared/utils/condition/condition';

describe('matches', () => {
    it('keeps a sub-category field disabled until a category is picked', () => {
        const rule = { field: 'category', is: 'empty' } as const;

        expect(matches(rule, { category: null })).toBe(true);
        expect(matches(rule, { category: '' })).toBe(true);
        expect(matches(rule, { category: '12' })).toBe(false);
    });

    it('shows a rule only for the states it names, whether the value arrives as text or a number', () => {
        const rule = { field: 'status', in: ['Pending', 'Confirmed'] } as const;

        expect(matches(rule, { status: 'Pending' })).toBe(true);
        expect(matches(rule, { status: 'Delivered' })).toBe(false);
        expect(matches({ field: 'page', in: [2] }, { page: '2' })).toBe(true);
    });

    it('reads nested fields and combines rules', () => {
        const row = { supplier: { name: 'Rahim Traders' }, status: 'Active' };

        expect(matches({ all: [{ field: 'supplier.name', is: 'filled' }, { field: 'status', in: ['Active'] }] }, row)).toBe(true);
        expect(matches({ any: [{ field: 'supplier.phone', is: 'filled' }, { field: 'status', in: ['Inactive'] }] }, row)).toBe(false);
    });
});
