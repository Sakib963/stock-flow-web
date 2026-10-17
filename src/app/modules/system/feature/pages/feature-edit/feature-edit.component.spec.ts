import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { FeatureEditComponent } from './feature-edit.component';

describe('FeatureEditComponent', () => {
    it('opens with the names it has, and saving with nothing changed sends nothing', async () => {
        await TestBed.configureTestingModule({
            imports: [FeatureEditComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ oid: 'f-1' }) } } }, ...OVERLAY_PROVIDERS],
        }).compileComponents();
        const fixture = TestBed.createComponent(FeatureEditComponent);
        fixture.detectChanges();
        const http = TestBed.inject(HttpTestingController);
        http.expectOne((r) => r.url.endsWith('/get-feature-details/f-1')).flush({ data: { details: { oid: 'f-1', label: 'Partners', label_bn: 'পার্টনার', description_en: null, description_bn: null, tags: ['influencer'], is_new: false }, actions: [], features: [], activity: [] } });
        fixture.detectChanges();

        const page = fixture.componentInstance;
        expect(page.form.getRawValue()).toEqual({ label: 'Partners', label_bn: 'পার্টনার', description_en: '', description_bn: '', tags: ['influencer'], is_new: false });
        page.save();
        http.expectNone((r) => r.url.endsWith('/update-feature-details'));
    });
});
