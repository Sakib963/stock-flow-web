import { HttpClientModule } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from '@app/app-routing.module';
import { AppComponent } from '@app/app.component';
import { tokenInterceptor } from '@app/core/interceptor/token-interceptor.service';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';

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
  ],
}).catch((err) => console.error(err));
