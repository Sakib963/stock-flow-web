import { localDigits } from './local-digits';

describe('localDigits', () => {
    it('writes every digit in Bengali when the page is in Bengali, keeping grouping and decimals', () => {
        expect(localDigits('1,10,250.00', 'bn')).toBe('১,১০,২৫০.০০');
    });

    it('leaves the text alone in English', () => {
        expect(localDigits('1,10,250.00', 'en')).toBe('1,10,250.00');
    });

    it('changes only the digits in mixed text', () => {
        expect(localDigits('12টি রেকর্ডের মধ্যে 1-12', 'bn')).toBe('১২টি রেকর্ডের মধ্যে ১-১২');
    });
});
