import { passwordRules, passwordStrength } from './password-rules';

describe('passwordRules', () => {
    const met = (value: string) => passwordRules(value).map((rule) => rule.met);

    it('ticks off length, a letter, a number and a special character one by one', () => {
        expect(met('')).toEqual([false, false, false, false]);
        expect(met('abc')).toEqual([false, true, false, false]);
        expect(met('abcdefg1')).toEqual([true, true, true, false]);
        expect(met('abcdef-1')).toEqual([true, true, true, true]);
        expect(met('12345678')).toEqual([true, false, true, false]);
    });
});

describe('passwordStrength', () => {
    it('grows with length and variety, and calls a long mixed password strong', () => {
        expect(passwordStrength('').percent).toBe(0);
        expect(passwordStrength('abcdefgh').level).toBe('weak');
        expect(passwordStrength('abcdef-1').percent).toBeGreaterThan(passwordStrength('abcdefgh').percent);
        expect(passwordStrength('Shop-Counter-2026').level).toBe('strong');
    });

    it('marks down a run of the same character', () => {
        expect(passwordStrength('Aaaa-1111-bbbb').percent).toBeLessThan(passwordStrength('Abcd-1357-wxyz').percent);
    });
});
