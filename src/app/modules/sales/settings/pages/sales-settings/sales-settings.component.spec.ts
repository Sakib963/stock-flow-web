import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { SalesSettingsComponent } from './sales-settings.component';

const open = async (granted = ['sales.settings.view', 'sales.settings.edit']) => {
    await TestBed.configureTestingModule({
        imports: [SalesSettingsComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), ...OVERLAY_PROVIDERS, provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), menu: () => [], business: () => null, user: () => ({ name: 'Owner' }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SalesSettingsComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_MESSAGE_TEMPLATES)).flush({ code: 200, data: [] });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, element: fixture.nativeElement as HTMLElement };
};

describe('SalesSettingsComponent', () => {
    it('adds a template with the details pressed into it, after asking', async () => {
        const { fixture, page, http } = await open();
        vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
        page.add();
        page.change({ name: 'Order received', body: 'Hi', order_statuses: ['Pending'] });
        page.insert('invoice_no');
        page.save();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.SAVE_MESSAGE_TEMPLATE)).request.body).toEqual({ name: 'Order received', language: 'en', body: 'Hi {invoice_no}', order_statuses: ['Pending'], status: 'Active' });
    });

    it('lets someone who may only look read the templates but not add one', async () => {
        const { element } = await open(['sales.settings.view']);
        expect(element.querySelector('[data-settings="add-template"]')).toBeNull();
        expect(element.querySelector('[data-settings="empty"]')).not.toBeNull();
    });
});
