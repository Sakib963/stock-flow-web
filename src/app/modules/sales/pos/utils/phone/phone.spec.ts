import { normalizePhone } from './phone';

describe('normalizePhone', () => {
    it('reads the same number however the customer said it', () => {
        expect(normalizePhone('+880 1987-654321')).toBe('01987654321');
        expect(normalizePhone('০১৯৮৭৬৫৪৩২১')).toBe('01987654321');
        expect(normalizePhone('01987654321')).toBe('01987654321');
    });

    it('waits until the number is a whole mobile number', () => {
        expect(normalizePhone('0198765')).toBeNull();
        expect(normalizePhone('0298765432')).toBeNull();
        expect(normalizePhone('')).toBeNull();
    });
});
