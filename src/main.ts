import { HttpClient, HttpClientModule } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from '@app/app-routing.module';
import { AppComponent } from '@app/app.component';
import { tokenInterceptor } from '@app/core/interceptor/token-interceptor.service';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';
import { CloudinaryModule } from '@cloudinary/ng';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      BrowserAnimationsModule,
      HttpClientModule,
      AppRoutingModule,
      CloudinaryModule,
      NgZorroCustomModule,
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      })
    ),
    tokenInterceptor,
    { provide: NZ_I18N, useValue: en_US },
  ],
}).catch((err) => console.error(err));
