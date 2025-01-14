import { HttpClientModule } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from '@app/app-routing.module';
import { AppComponent } from '@app/app.component';
import { tokenInterceptor } from '@app/core/interceptor/token-interceptor.service';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      HttpClientModule,
      NgZorroCustomModule,
      BrowserAnimationsModule,
      AppRoutingModule
    ),
    tokenInterceptor,
    { provide: NZ_I18N, useValue: en_US },
  ],
}).catch((err) => console.error(err));
