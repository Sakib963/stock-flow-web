import { passwordRules } from './password-rules';

describe('passwordRules', () => {
    const met = (value: string) => passwordRules(value).map((rule) => rule.met);

    it('ticks off length, a letter and a number one by one', () => {
        expect(met('')).toEqual([false, false, false]);
        expect(met('abc')).toEqual([false, true, false]);
        expect(met('abcdefg1')).toEqual([true, true, true]);
        expect(met('12345678')).toEqual([true, false, true]);
    });
});
