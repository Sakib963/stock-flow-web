import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';

/**
 * Any number or text with digits in it, in the digits of the language on screen: `{{ count | digits }}`.
 *
 * Impure because the language is read here rather than passed in, so a template never has to hand
 * it over and a language switch redraws every number. The work is one regex over a short string.
 * Codes, batch and invoice numbers are identifiers, not numbers, and do not go through it.
 */
@Pipe({ name: 'digits', pure: false })
export class DigitsPipe implements PipeTransform {
    private readonly _language = inject(LanguageService).current;

    transform(value: unknown): string {
        if (value === null || value === undefined) return '';
        return localDigits(String(value), this._language());
    }
}
