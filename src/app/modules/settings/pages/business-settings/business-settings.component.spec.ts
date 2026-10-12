import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { BusinessSettings } from '@app/core/models/business-settings.model';
import { PhotoUpload } from '@app/core/models/photo-upload.model';
import { SessionService } from '@app/core/services/session/session.service';
import { BusinessSettingsService } from '@app/modules/settings/services/business-settings.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { BusinessSettingsComponent } from './business-settings.component';

const SETTINGS: BusinessSettings = { name: 'A boutique', logo_url: null, address: null, phone_primary: '01711000111', phone_secondary: null, website: 'https://www.aboutique.test', facebook_url: null, instagram_url: null, edited_on: null, edited_by: null };

const open = async (granted = ['settings.business.view', 'settings.business.edit']) => {
    const load = vi.fn(() => Promise.resolve());
    await TestBed.configureTestingModule({
        imports: [BusinessSettingsComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), loadedFor: () => 'session-1', load, menu: () => [] } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(BusinessSettingsComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_BUSINESS_SETTINGS)).flush({ code: 200, data: SETTINGS });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, load };
};

describe('BusinessSettingsComponent', () => {
    it('fills the form from the settings, and saves only after asking, then reloads this tab at once', async () => {
        const { fixture, page, http, load } = await open();
        expect(page.form.getRawValue().website).toBe('https://www.aboutique.test');
        const ask = vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
        page.form.patchValue({ name: '  A new name  ', address: 'House 5, Road 2' });
        page.save();
        expect(ask).toHaveBeenCalled();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.UPDATE_BUSINESS_SETTINGS));
        expect(sent.request.body).toEqual({ name: 'A new name', logo_url: null, address: 'House 5, Road 2', phone_primary: '01711000111', phone_secondary: null, website: 'https://www.aboutique.test', facebook_url: null, instagram_url: null });
        sent.flush({ code: 200, data: { ...SETTINGS, name: 'A new name' } });
        expect(load).toHaveBeenCalledWith('session-1');
    });

    it('sends nothing without a name', async () => {
        const { page, http } = await open();
        page.form.patchValue({ name: '' });
        page.save();
        http.expectNone((r) => r.url.includes(APIEndpoint.UPDATE_BUSINESS_SETTINGS));
    });

    it('shows the details to someone who may only look, with nothing to change and no Save', async () => {
        const { page, fixture } = await open(['settings.business.view']);
        expect(page.form.disabled).toBe(true);
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-settings="pick-logo"]')).toBeNull();
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('settings.business.readOnly');
    });

    it('holds Save while the logo uploads, then saves the uploaded logo', async () => {
        const { fixture, page, http } = await open();
        vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
        vi.spyOn(TestBed.inject(BusinessSettingsService), 'uploadLogo').mockReturnValue(of<PhotoUpload[]>({ state: 'uploading', progress: 30 }, { state: 'done', url: 'https://res.cloudinary.com/x/image/upload/v1/stockflow/branding/logo.png' }));
        page.pick(new File(['x'], 'logo.png', { type: 'image/png' }) as unknown as NzUploadFile);
        expect(page.logo()).toContain('stockflow/branding/logo.png');
        page.save();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.UPDATE_BUSINESS_SETTINGS)).request.body.logo_url).toContain('stockflow/branding/logo.png');
    });
});
