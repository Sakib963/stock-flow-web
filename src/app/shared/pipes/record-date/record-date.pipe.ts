import { Pipe, PipeTransform } from '@angular/core';
import { AppLanguage } from '@app/core/models/language.model';

const DAY_MS = 86_400_000;

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
];

/**
 * A list date: 24 Aug 2026, with the month in the reader's language and Western digits in both,
 * because staff cross-reference dates against paper and phones. `relative` applies only under 24
 * hours ("4 hours ago"); anything older is a date, since "12 days ago" makes a person count.
 * The language is an argument so the pipe stays pure.
 */
@Pipe({ name: 'recordDate' })
export class RecordDatePipe implements PipeTransform {
    transform(value: unknown, language: AppLanguage, options: { time?: boolean; relative?: boolean } = {}): string {
        if (value === null || value === undefined || value === '') return '';
        const date = new Date(value as string);
        if (Number.isNaN(date.getTime())) return String(value);

        const locale = language === 'bn' ? 'bn-BD-u-nu-latn' : 'en-GB';
        const elapsed = Date.now() - date.getTime();

        if (options.relative && elapsed >= 0 && elapsed < DAY_MS) {
            const seconds = Math.round(elapsed / 1000);
            const [unit, size] = RELATIVE_UNITS.find(([, s]) => seconds >= s) ?? ['second', 1];
            return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.floor(seconds / size), unit);
        }

        return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', ...(options.time ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(date);
    }
}
