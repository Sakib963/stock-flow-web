import { Pipe, PipeTransform } from '@angular/core';

const MONEY = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUMBER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/**
 * Taka in en-IN grouping with two decimals, 1,10,250.00, in both languages: staff read amounts
 * against a calculator and a phone, which use Western digits. The ৳ glyph belongs to the column
 * header, never repeated per cell.
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
    transform(value: unknown, format: 'money' | 'number' = 'money'): string {
        if (value === null || value === undefined || value === '') return '';
        const amount = Number(value);
        if (Number.isNaN(amount)) return String(value);
        return (format === 'money' ? MONEY : NUMBER).format(amount);
    }
}
