import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';

describe('RecordDatePipe', () => {
    const pipe = new RecordDatePipe();

    it('writes a list date as day, short month and year', () => {
        expect(pipe.transform('2026-08-24T10:00:00Z', 'en')).toBe('24 Aug 2026');
    });

    it('keeps Western digits in Bengali', () => {
        expect(pipe.transform('2026-08-24T10:00:00Z', 'bn')).toMatch(/24.*2026/);
    });

    it('says how long ago only within the last day', () => {
        const fourHoursAgo = new Date(Date.now() - 4 * 3600_000).toISOString();
        const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();

        expect(pipe.transform(fourHoursAgo, 'en', { relative: true })).toBe('4 hours ago');
        expect(pipe.transform(threeDaysAgo, 'en', { relative: true })).not.toContain('ago');
    });
});
