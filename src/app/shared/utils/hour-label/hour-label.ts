import { AppLanguage } from '@app/core/models/language.model';

/** An hour of the day as a reader says it, 9 am or ৯ AM, in their language and digits. */
export const hourLabel = (hour: number, language: AppLanguage): string =>
    new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', { hour: 'numeric', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 1, hour))).replace(/\s/g, ' ');
