import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';

const MONEY = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUMBER = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/**
 * Taka in en-IN grouping with two decimals, 1,10,250.00, in the digits of the language on screen:
 * ১,১০,২৫০.০০ in Bengali. The ৳ glyph belongs to the column header, never repeated per cell.
 *
 * Impure for the same reason as `digits`: it reads the language itself, so every existing
 * `| money` follows a switch without being handed the language.
 */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
    private readonly _language = inject(LanguageService).current;

    transform(value: unknown, format: 'money' | 'number' = 'money'): string {
        if (value === null || value === undefined || value === '') return '';
        const amount = Number(value);
        if (Number.isNaN(amount)) return String(value);
        return localDigits((format === 'money' ? MONEY : NUMBER).format(amount), this._language());
    }
}
