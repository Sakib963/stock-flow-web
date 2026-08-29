import { HttpClient, HttpClientModule } from '@angular/common/http';
import { importProvidersFrom, provideAppInitializer, inject } from '@angular/core';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { SettingsService } from '@app/core/services/settings.service';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from '@app/app-routing.module';
import { AppComponent } from '@app/app.component';
import { tokenInterceptor } from '@app/core/interceptor/token-interceptor.service';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import { CloudinaryModule } from '@cloudinary/ng';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { forkJoin, map } from 'rxjs';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNgIconsConfig } from '@ng-icons/core';


export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
export function httpLoaderFactory(http: HttpClient): any {
  const modules = [
    {
      prefix: './assets/i18n/admin/',
      suffix: '.json',
    },
    {
      prefix: './assets/i18n/manager/',
      suffix: '.json',
    },
    {
      prefix: './assets/i18n/sales/',
      suffix: '.json',
    },
    {
      prefix: './assets/i18n/common/',
      suffix: '.json',
    },
  ];
  return new MultiTranslateHttpLoader(http, modules);
}

export class MultiTranslateHttpLoader implements TranslateLoader {
  constructor(
    private _http: HttpClient,
    private _resources: Array<{ prefix: string; suffix: string }>
  ) {}

  getTranslation(lang: string): any {
    return forkJoin(
      this._resources.map((config) =>
        this._http.get(`${config.prefix}${lang}${config.suffix}`)
      )
    ).pipe(
      map((response: any) => {
        return response.reduce((a: any, b: any) => Object.assign(a, b));
      })
    );
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      BrowserAnimationsModule,
      AppRoutingModule,
      CloudinaryModule,
      HttpClientModule,
      NgZorroCustomModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpLoaderFactory,
          deps: [HttpClient],
        },
      })
    ),
    tokenInterceptor,
    { provide: NZ_I18N, useValue: en_US },
    // Preload shop settings before the app builds routes/menu, but only for an
    // already-authenticated user (the settings API needs a token). Fresh logins
    // load it via the sidebar before rendering the menu.
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      const settings = inject(SettingsService);
      return auth.getJwtToken() ? settings.load() : Promise.resolve();
    }),
    provideNzDateFnsAdapter(),
    provideNgIconsConfig({ size: '1.25rem', strokeWidth: 1.75 }),
  ],
}).catch((err) => console.error(err));
