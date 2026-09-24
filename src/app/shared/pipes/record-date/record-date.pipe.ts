import { Pipe, PipeTransform } from '@angular/core';
import { DateFormat } from '@app/core/models/config.model';
import { AppLanguage } from '@app/core/models/language.model';

const DAY_MS = 86_400_000;

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
];

const DATE_PARTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
const SLASHED_PARTS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
const TIME_24: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
const TIME_12: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

/**
 * Every shape a date takes in a list, keyed by what a person sees. A config names one of these
 * rather than a pattern string, so two screens cannot spell the same date two ways.
 */
const FORMATS: Record<Exclude<DateFormat, 'relative'>, Intl.DateTimeFormatOptions> = {
    date: DATE_PARTS,
    'date-time': { ...DATE_PARTS, ...TIME_24 },
    'date-time-12': { ...DATE_PARTS, ...TIME_12 },
    slashed: SLASHED_PARTS,
    'slashed-time': { ...SLASHED_PARTS, ...TIME_24 },
    'slashed-time-12': { ...SLASHED_PARTS, ...TIME_12 },
    time: TIME_24,
    'time-12': TIME_12,
};

/**
 * A list date: 24 Aug 2026 by default, month and digits both in the reader's language. `relative` applies only
 * under 24 hours ("4 hours ago"); anything older falls back to the plain date, since "12 days ago"
 * makes a person count. The language is an argument so the pipe stays pure.
 */
@Pipe({ name: 'recordDate' })
export class RecordDatePipe implements PipeTransform {
    transform(value: unknown, language: AppLanguage, format: DateFormat = 'date'): string {
        if (value === null || value === undefined || value === '') return '';
        const date = new Date(value as string);
        if (Number.isNaN(date.getTime())) return String(value);

        const locale = language === 'bn' ? 'bn-BD' : 'en-GB';
        const elapsed = Date.now() - date.getTime();

        if (format === 'relative' && elapsed >= 0 && elapsed < DAY_MS) {
            const seconds = Math.round(elapsed / 1000);
            const [unit, size] = RELATIVE_UNITS.find(([, s]) => seconds >= s) ?? ['second', 1];
            return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.floor(seconds / size), unit);
        }

        return new Intl.DateTimeFormat(locale, FORMATS[format === 'relative' ? 'date' : format]).format(date);
    }
}
