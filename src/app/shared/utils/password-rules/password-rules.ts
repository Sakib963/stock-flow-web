/**
 * The password rules the server holds a new password to (`auth/password-rule.js`), checked live so
 * the list ticks off as the person types: on password reset and on change password alike.
 */
export const passwordRules = (value: string): { key: string; met: boolean }[] => [
    { key: 'auth.reset.ruleLength', met: value.length >= 8 },
    { key: 'auth.reset.ruleLetter', met: /[A-Za-z]/.test(value) },
    { key: 'auth.reset.ruleNumber', met: /[0-9]/.test(value) },
    { key: 'auth.reset.ruleSymbol', met: /[^A-Za-z0-9]/.test(value) },
];

export type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

/**
 * How hard a password is to guess, as a percentage for the meter: length counts most, then mixing
 * small and capital letters, numbers and symbols. A guide for the person typing, not a rule.
 */
export const passwordStrength = (value: string): { percent: number; level: StrengthLevel } => {
    if (!value) return { percent: 0, level: 'weak' };
    const length = Math.min(value.length, 16) / 16;
    const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((kind) => kind.test(value)).length / 4;
    const repeats = /(.)\1\1/.test(value) ? 0.15 : 0;
    const percent = Math.max(5, Math.round((length * 0.55 + kinds * 0.45 - repeats) * 100));
    const level: StrengthLevel = percent < 40 ? 'weak' : percent < 65 ? 'fair' : percent < 85 ? 'good' : 'strong';
    return { percent, level };
};
