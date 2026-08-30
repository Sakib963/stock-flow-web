import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNgIconsConfig } from '@ng-icons/core';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { tokenInterceptor } from '@app/core/interceptors/token.interceptor';
import { LanguageService } from '@app/core/services/language.service';

// No zone.js and no provideZonelessChangeDetection() call: Angular 22 runs zoneless whenever
// zone.js is absent from the polyfills, which is the default for a v22 application. Components
// must therefore drive change detection through signals rather than relying on zone patching.
export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withFetch(), withInterceptors([tokenInterceptor])),
        provideNzI18n(en_US),
        // ng-zorro's date pickers need a date adapter selected explicitly from v22 onward.
        provideNzDateFnsAdapter(),
        provideNgIconsConfig({ size: '1.25rem', strokeWidth: 1.75 }),
        provideTranslateService({
            fallbackLang: 'en',
            loader: provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
        }),
        // Instantiated at boot so the stored language is applied before the first screen paints,
        // rather than flashing English and then switching.
        provideAppInitializer(() => {
            inject(LanguageService);
        }),
    ],
};
