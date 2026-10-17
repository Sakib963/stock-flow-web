import { TranslateService } from '@ngx-translate/core';
import { insightParams, rateOf } from './sales-analytics';

const number = (n: number) => String(n);

describe('sales analytics helpers', () => {
    it('shows a rate over 20, the counts under it, and a dash over nothing', () => {
        expect(rateOf(5, 25, number)).toEqual({ text: '20%', bar: 20 });
        expect(rateOf(3, 4, number)).toEqual({ text: '3 / 4', bar: null });
        expect(rateOf(0, 0, number)).toEqual({ text: '-', bar: null });
    });

    it('says a place in the language on screen and translates a key param under its own name', () => {
        const translate = { instant: (key: string) => `[${key}]` } as unknown as TranslateService;
        const params = insightParams({ key: 'x', params: { place: { en: 'Dhaka', bn: 'ঢাকা' }, bestKey: 'sales.order.confirmedVia.PhoneCall', rate: 12, product: 'A54' } }, 'bn', translate, (n) => `#${n}`);
        expect(params).toEqual({ place: 'ঢাকা', best: '[sales.order.confirmedVia.PhoneCall]', rate: '#12', product: 'A54' });
    });
});
