import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { environment } from '@env/environment';

describe('RecordDatePipe', () => {
    const pipe = new RecordDatePipe();
    // The pipe formats in the business zone, Asia/Dhaka until the session sets another, whatever the
    // machine's own zone is: 08:05 UTC is 14:05 there.
    const afternoon = '2026-08-24T08:05:00Z';

    it('writes a list date as day, short month and year', () => {
        expect(pipe.transform('2026-08-24T10:00:00Z', 'en')).toBe('24 Aug 2026');
    });

    it('writes the date in Bengali digits when the page is in Bengali', () => {
        expect(pipe.transform('2026-08-24T10:00:00Z', 'bn')).toMatch(/২৪.*২০২৬/);
    });

    it('says how long ago only within the last day', () => {
        const fourHoursAgo = new Date(Date.now() - 4 * 3600_000).toISOString();
        const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();

        expect(pipe.transform(fourHoursAgo, 'en', 'relative')).toBe('4 hours ago');
        expect(pipe.transform(threeDaysAgo, 'en', 'relative')).not.toContain('ago');
    });

    it('writes the slashed forms with two digits, so a column of them lines up', () => {
        expect(pipe.transform('2026-01-07T04:00:00Z', 'en', 'slashed')).toBe('07/01/2026');
    });

    it('carries the time in both clocks when a column asks for it', () => {
        expect(pipe.transform(afternoon, 'en', 'date-time')).toMatch(/24 Aug 2026.*14:05/);
        expect(pipe.transform(afternoon, 'en', 'date-time-12')).toMatch(/24 Aug 2026.*2:05/);
        expect(pipe.transform(afternoon, 'en', 'time')).toBe('14:05');
    });

    it('keeps AM and PM in a Bengali 12 hour time, unless the deployment asks for words', () => {
        const morning = '2026-09-30T05:35:00Z';
        expect(pipe.transform(morning, 'bn', 'date-time-12')).toMatch(/১১:৩৫\s?AM$/);

        (environment as { bengaliTimeInWords?: boolean }).bengaliTimeInWords = true;
        try {
            expect(pipe.transform(morning, 'bn', 'date-time-12')).toMatch(/১১:৩৫ পূর্বাহ্ণ$/);
            expect(pipe.transform(afternoon, 'bn', 'time-12')).toMatch(/২:০৫ অপরাহ্ণ$/);
        } finally {
            (environment as { bengaliTimeInWords?: boolean }).bengaliTimeInWords = false;
        }
    });
});
