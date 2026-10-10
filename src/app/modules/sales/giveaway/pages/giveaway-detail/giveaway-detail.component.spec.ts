import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { GiveawayDetails } from '@app/core/models/giveaway.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { GiveawayDetailComponent } from './giveaway-detail.component';

const OID = '7b1c6f4e-6c1e-4b8e-9d55-2f7d2a3b9c22';
const ALL = ['sales.giveaway.view', 'sales.giveaway.confirm', 'sales.giveaway.cancel'];

const record = (over: Partial<GiveawayDetails> = {}): GiveawayDetails => ({
    oid: OID,
    giveaway_no: 'GFT-2610-0001',
    customer_oid: null,
    recipient_name: 'A younger brother',
    recipient_phone: null,
    address_line: null,
    note: 'Eid gift',
    status: 'Draft',
    cancel_reason: null,
    given_on: null,
    given_by: null,
    created_on: '2026-10-10T10:00:00.000',
    created_by: 'Owner',
    lines: [{ oid: 'l-1', inventory_oid: 'b-1', product_oid: 'p-1', product_name: 'Silk scarf', batch_code: 'B-1', quantity: 2, cost_price: 700 }],
    activity: [{ title: 'Giveaway saved', description: 'GFT-2610-0001 to A younger brother, 1 line(s)', performed_by: 'Owner', performed_on: '2026-10-10T10:00:00.000' }],
    ...over,
});

const open = async (details: GiveawayDetails, granted = ALL) => {
    await TestBed.configureTestingModule({
        imports: [GiveawayDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ oid: OID }), data: {} } } }, { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), menu: () => [], business: () => null, user: () => ({ name: 'Owner' }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(GiveawayDetailComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_GIVEAWAY_DETAILS)).flush({ code: 200, data: details });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, element: fixture.nativeElement as HTMLElement };
};

const quick = (element: HTMLElement) => [...element.querySelectorAll('[data-quick]')].map((node) => node.getAttribute('data-quick'));

describe('GiveawayDetailComponent', () => {
    it('offers Give and Cancel on a draft, and nothing once it is given', async () => {
        const draft = await open(record());
        expect(quick(draft.element)).toEqual(['give', 'cancel']);
        TestBed.resetTestingModule();
        const given = await open(record({ status: 'Given', given_on: '2026-10-10T11:00:00.000', given_by: 'Owner' }));
        expect(quick(given.element)).toEqual(['none']);
    });

    it('shows cost only to someone who may see stock value', async () => {
        const plain = await open(record());
        expect(plain.element.querySelector('[data-detail="cost"]')).toBeNull();
        TestBed.resetTestingModule();
        const owner = await open(record(), [...ALL, 'inventory.stock-value.view']);
        expect(owner.element.querySelector('[data-detail="cost"]')?.textContent).toContain('1,400');
    });

    it('cancels with a reason and reloads the record', async () => {
        const { fixture, page, http } = await open(record());
        page.openCancel();
        page.cancelReason.set('Saved by mistake');
        page.submitCancel();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.CANCEL_GIVEAWAY));
        expect(sent.request.body).toEqual({ oid: OID, reason: 'Saved by mistake' });
        sent.flush({ code: 200, data: { oid: OID } });
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_GIVEAWAY_DETAILS)).flush({ code: 200, data: record({ status: 'Cancelled', cancel_reason: 'Saved by mistake' }) });
        fixture.detectChanges();
        expect(page.cancelling()).toBe(false);
        expect(page.record()?.status).toBe('Cancelled');
    });
});
