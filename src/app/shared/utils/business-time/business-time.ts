/**
 * Every time a person reads follows the business's clock, not the browser's, so partners in Dhaka
 * and New York see the same 10:18 for the same sale (decided by the user, 2026-10-01). The zone comes
 * with the session; the server stores and sends moments as UTC.
 */
const FALLBACK_ZONE = 'Asia/Dhaka';
let zone = FALLBACK_ZONE;

export const setBusinessZone = (next: string | null | undefined): void => {
    zone = next || FALLBACK_ZONE;
};

export const businessZone = (): string => zone;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ZONED = /(Z|[+-]\d{2}:?\d{2})$/i;

/** A plain calendar day, such as an expiry date: shown as the day it is, never shifted. */
export const isDay = (value: unknown): value is string => typeof value === 'string' && DAY.test(value);

/** A stored moment as a Date. A time sent without a zone is UTC, which is how the database keeps it. */
export const toMoment = (value: string | Date): Date => {
    if (value instanceof Date) return value;
    if (isDay(value)) return new Date(`${value}T00:00:00Z`);
    return new Date(ZONED.test(value) ? value : `${value}Z`);
};

/** The zone a value is shown in: the business's for a moment, UTC for a calendar day built at UTC midnight. */
export const zoneFor = (value: unknown): string => (isDay(value) ? 'UTC' : zone);

/** A moment's day on the business's calendar, as YYYY-MM-DD. */
export const businessDay = (moment: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(moment);

/** Today on the business's calendar, as YYYY-MM-DD. */
export const businessToday = (now: Date = new Date()): string => businessDay(now);

/** A YYYY-MM-DD day moved by whole days, on the calendar alone. */
export const addDays = (day: string, days: number): string => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
