/**
 * The password rules the server holds a new password to (`auth/password-rule.js`), checked live so
 * the list ticks off as the person types: on password reset and on change password alike.
 */
export const passwordRules = (value: string): { key: string; met: boolean }[] => [
    { key: 'auth.reset.ruleLength', met: value.length >= 8 },
    { key: 'auth.reset.ruleLetter', met: /[A-Za-z]/.test(value) },
    { key: 'auth.reset.ruleNumber', met: /[0-9]/.test(value) },
];
