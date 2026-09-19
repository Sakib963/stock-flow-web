import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';

describe('MoneyPipe', () => {
    const pipe = new MoneyPipe();

    it('groups taka the way a Bangladeshi reads it, always with two decimals', () => {
        expect(pipe.transform(110250)).toBe('1,10,250.00');
        expect(pipe.transform('10508.5')).toBe('10,508.50');
    });

    it('leaves a missing amount blank rather than reading 0.00', () => {
        expect(pipe.transform(null)).toBe('');
        expect(pipe.transform(undefined)).toBe('');
    });

    it('shows a plain number without forcing decimals', () => {
        expect(pipe.transform(1250, 'number')).toBe('1,250');
    });
});
