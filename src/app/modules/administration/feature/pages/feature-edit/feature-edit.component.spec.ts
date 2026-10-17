import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
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

    it('names the feature in the save question', async () => {
        await TestBed.configureTestingModule({
            imports: [FeatureEditComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ oid: 'f-1' }) } } }, ...OVERLAY_PROVIDERS],
        }).compileComponents();
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('en', { administration: { feature: { confirmEdit: { title: 'Save changes to {{name}}?' } } } });
        translate.use('en');
        const fixture = TestBed.createComponent(FeatureEditComponent);
        fixture.detectChanges();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.endsWith('/get-feature-details/f-1'))
            .flush({ data: { details: { oid: 'f-1', label: 'Partners', label_bn: 'পার্টনার', description_en: null, description_bn: null, tags: [], is_new: false }, actions: [], features: [], activity: [] } });
        fixture.detectChanges();

        const page = fixture.componentInstance;
        page.form.controls.label.setValue('Influencers');
        page.form.markAsDirty();
        page.save();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(document.querySelector('.ant-modal-confirm-title')?.textContent).toContain('Save changes to Influencers?');
    });
});
