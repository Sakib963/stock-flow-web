import { ExpiryState } from '@app/core/models/product.model';

/** A local calendar day as YYYY-MM-DD, never through toISOString, which shifts it by the timezone. */
export const toDay = (date: Date | null): string | null => (date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null);

export const fromDay = (day: string | null): Date | null => (day ? new Date(`${day}T00:00:00`) : null);

/** Expired once the day has passed; soon within 30 days, which leaves time to discount or return it. */
export const expiryState = (day: string | null, today: Date = new Date()): ExpiryState => {
    if (!day) return 'none';
    const todayDay = toDay(today)!;
    if (day < todayDay) return 'expired';
    const soon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    return day <= toDay(soon)! ? 'soon' : 'fresh';
};
