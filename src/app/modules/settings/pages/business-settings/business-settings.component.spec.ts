import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { BusinessSettings } from '@app/core/models/business-settings.model';
import { SessionService } from '@app/core/services/session/session.service';
import { BusinessSettingsComponent } from './business-settings.component';

const SETTINGS: BusinessSettings = { name: 'A boutique', logo_url: null, address: 'House 5, Road 2', phone_primary: '01711000111', phone_secondary: null, website: 'https://www.aboutique.test', facebook_url: null, instagram_url: null, edited_on: null, edited_by: null };

const open = async (granted = ['settings.business.view', 'settings.business.edit']) => {
    await TestBed.configureTestingModule({
        imports: [BusinessSettingsComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), menu: () => [] } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(BusinessSettingsComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.includes(APIEndpoint.GET_BUSINESS_SETTINGS)).flush({ code: 200, data: SETTINGS });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
};

describe('BusinessSettingsComponent', () => {
    it('shows the settings to read, with no form', async () => {
        const { element } = await open();
        expect(element.querySelector('[data-settings="details"]')?.textContent).toContain('House 5, Road 2');
        expect(element.querySelector('input')).toBeNull();
    });

    it('opens the edit page from Edit', async () => {
        const { element } = await open();
        const go = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        (element.querySelector('[data-settings="edit"]') as HTMLButtonElement).click();
        expect(go).toHaveBeenCalledWith('/app/settings/edit');
    });

    it('has no Edit for someone who may only look', async () => {
        const { element } = await open(['settings.business.view']);
        expect(element.querySelector('[data-settings="edit"]')).toBeNull();
    });

    it('steps back to wherever the person came from with Back', async () => {
        const { element } = await open();
        const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);
        (element.querySelector('[data-settings="back"]') as HTMLButtonElement).click();
        expect(back).toHaveBeenCalled();
    });
});
