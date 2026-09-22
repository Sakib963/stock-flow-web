import { AppLanguage } from '@app/core/models/language.model';
import { Text } from '@app/core/models/config.model';

/**
 * A config's `Text` as a plain string, for the places a pipe cannot reach: a chip built as one
 * string, a modal title, a message.
 *
 * A `Text` is an i18n key today and both languages inline once configs come from the database, and
 * both halves have to survive. Taking `.en` from an inline pair is what silently shows English to
 * the half of the users who read Bengali, so the language is an argument rather than an assumption,
 * and the key path goes through the caller's own translate instance.
 */
export function resolveText(text: Text, language: AppLanguage, translate: (key: string) => string): string {
    if (typeof text !== 'string') return language === 'bn' ? text.bn : text.en;
    return translate(text);
}
