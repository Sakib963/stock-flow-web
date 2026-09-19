import { Pipe, PipeTransform, Signal, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Text } from '@app/core/models/config.model';
import { LanguageService } from '@app/core/services/language/language.service';

/**
 * A config `Text` in the current language: an i18n key through ngx-translate, or both languages
 * inline once configs come from the database. Impure for the same reason `translate` is: the
 * result changes when the language or the loaded translations do, with no new input.
 */
@Pipe({ name: 'text', pure: false })
export class TextPipe implements PipeTransform {
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService);

    private _key: string | null = null;
    private _params: Record<string, unknown> | undefined;
    private _cached: Signal<string> | null = null;

    transform(value: Text | null | undefined, params?: Record<string, unknown>): string {
        if (value === null || value === undefined || value === '') return '';
        if (typeof value !== 'string') return this._language.current() === 'bn' ? value.bn || value.en : value.en;

        if (value !== this._key || JSON.stringify(params) !== JSON.stringify(this._params)) {
            this._cached = this._translate.translate(value, params) as Signal<string>;
            this._key = value;
            this._params = params;
        }
        return this._cached!();
    }
}
