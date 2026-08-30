import { Injectable, effect, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Constants } from '@app/core/constants/constants';

export type AppLanguage = 'en' | 'bn';
export const APP_LANGUAGES: readonly AppLanguage[] = ['en', 'bn'];

/**
 * Holds the chosen language and keeps ngx-translate and the document in step with it.
 *
 * The choice is stored per device rather than per account, because sign-in is the one screen a
 * person reaches before the product knows who they are, and the counter machine is shared.
 * English is the first-load default: clients are onboarded in English and the owner is the first
 * to touch a new install.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
    private readonly _translate = inject(TranslateService);
    readonly current = signal<AppLanguage>(this.restore());

    constructor() {
        this._translate.addLangs([...APP_LANGUAGES]);
        this._translate.setFallbackLang('en');

        effect(() => {
            const lang = this.current();
            this._translate.use(lang);

            // Drives the Bengali font stack and line-height in styles.css, and tells the browser
            // which language it is reading for hyphenation and screen readers.
            document.documentElement.lang = lang;
            document.body.classList.toggle('lang-bn', lang === 'bn');
            document.body.classList.toggle('lang-en', lang === 'en');

            try {
                localStorage.setItem(Constants.LANG_STORE_KEY, lang);
            } catch {
                // A device with storage blocked still gets the language, just not next visit.
            }
        });
    }

    use(lang: AppLanguage): void {
        this.current.set(lang);
    }

    private restore(): AppLanguage {
        try {
            const stored = localStorage.getItem(Constants.LANG_STORE_KEY);
            if (stored === 'en' || stored === 'bn') return stored;
        } catch {
            // Ignore and fall through to the default.
        }
        return 'en';
    }
}
