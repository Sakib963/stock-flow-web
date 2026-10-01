import { ExpiryState } from '@app/core/models/product.model';
import { addDays, businessToday } from '@app/shared/utils/business-time/business-time';

/** A local calendar day as YYYY-MM-DD, never through toISOString, which shifts it by the timezone. */
export const toDay = (date: Date | null): string | null => (date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null);

export const fromDay = (day: string | null): Date | null => (day ? new Date(`${day}T00:00:00`) : null);

/** Expired once the day has passed on the business's calendar; soon within 30 days, which leaves time to discount or return it. */
export const expiryState = (day: string | null, now: Date = new Date()): ExpiryState => {
    if (!day) return 'none';
    const today = businessToday(now);
    if (day < today) return 'expired';
    return day <= addDays(today, 30) ? 'soon' : 'fresh';
};
