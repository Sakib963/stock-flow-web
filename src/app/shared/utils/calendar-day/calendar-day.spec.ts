import { expiryState, fromDay, toDay } from '@app/shared/utils/calendar-day/calendar-day';

describe('calendar days', () => {
    const today = new Date(2026, 8, 30, 23, 30);

    it('writes and reads a local day without shifting it by the timezone', () => {
        expect(toDay(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
        expect(toDay(fromDay('2027-03-31'))).toBe('2027-03-31');
        expect(toDay(null)).toBeNull();
    });

    it('calls a batch expired only after its day, and expiring soon within 30 days', () => {
        expect(expiryState(null, today)).toBe('none');
        expect(expiryState('2026-09-29', today)).toBe('expired');
        expect(expiryState('2026-09-30', today)).toBe('soon');
        expect(expiryState('2026-10-30', today)).toBe('soon');
        expect(expiryState('2026-10-31', today)).toBe('fresh');
    });
});
