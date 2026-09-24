import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';

describe('RecordDatePipe', () => {
    const pipe = new RecordDatePipe();
    // Built from local parts, not a UTC string: the pipe formats in the reader's zone, so a fixed
    // instant would read as a different hour on a machine set to another one.
    const afternoon = new Date(2026, 7, 24, 14, 5).toISOString();

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
        expect(pipe.transform(new Date(2026, 0, 7, 10, 0).toISOString(), 'en', 'slashed')).toBe('07/01/2026');
    });

    it('carries the time in both clocks when a column asks for it', () => {
        expect(pipe.transform(afternoon, 'en', 'date-time')).toMatch(/24 Aug 2026.*14:05/);
        expect(pipe.transform(afternoon, 'en', 'date-time-12')).toMatch(/24 Aug 2026.*2:05/);
        expect(pipe.transform(afternoon, 'en', 'time')).toBe('14:05');
    });
});
