import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { addDays, businessToday, setBusinessZone, toMoment } from './business-time';

// One sale at 10:18 in Dhaka, sent by the server as the UTC it is stored in, with no zone on it.
const SALE = '2026-10-01T04:18:00.000';

describe('business time', () => {
    afterEach(() => setBusinessZone('Asia/Dhaka'));

    it('reads a time sent without a zone as UTC, and leaves a calendar day alone', () => {
        expect(toMoment(SALE).toISOString()).toBe('2026-10-01T04:18:00.000Z');
        expect(toMoment('2026-10-01T04:18:00.000Z').toISOString()).toBe('2026-10-01T04:18:00.000Z');
        expect(toMoment('2026-10-15').toISOString()).toBe('2026-10-15T00:00:00.000Z');
    });

    it('shows partners in Dhaka, New York and Los Angeles the same business time for one sale', () => {
        const pipe = new RecordDatePipe();
        setBusinessZone('Asia/Dhaka');
        expect(pipe.transform(SALE, 'en', 'date-time')).toBe('1 Oct 2026, 10:18');
        // The browser's own zone plays no part: only the business's does.
        setBusinessZone('America/New_York');
        expect(pipe.transform(SALE, 'en', 'date-time')).toBe('1 Oct 2026, 00:18');
    });

    it('never moves a calendar day, whatever the business zone', () => {
        const pipe = new RecordDatePipe();
        setBusinessZone('America/Los_Angeles');
        expect(pipe.transform('2026-10-15', 'en')).toBe('15 Oct 2026');
    });

    it('turns today at the business midnight', () => {
        expect(businessToday(new Date('2026-09-30T17:59:00Z'))).toBe('2026-09-30');
        expect(businessToday(new Date('2026-09-30T18:00:00Z'))).toBe('2026-10-01');
        expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
        expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    });
});
