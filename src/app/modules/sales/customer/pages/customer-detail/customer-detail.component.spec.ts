import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { CustomerDetailComponent } from './customer-detail.component';

const ADDRESS = { oid: 'a-1', label: 'Home', recipient_name: 'Person A', recipient_phone: null, address_line: 'House 12, Road 4', district_oid: 'd-1', district_name_en: 'Dhaka', district_name_bn: 'ঢাকা', thana_oid: 't-1', thana_name_en: 'Mirpur', thana_name_bn: 'মিরপুর', area_text: null, postal_code: '1216', is_default: true };

const details = (over: object = {}) => ({
    code: 200,
    data: {
        details: { oid: 'c-1', name: 'Person A', phone: '01987654321', gender: null, age_band: null, flag: 'None', flag_reason: null, social_handle: null, note: null, status: 'Active' },
        stats: { orders: 3, sales: 2, lifetime_value: 3100, average_order: 1550, delivered: 0, refused_parcels: 0, delivered_rate: null, last_order_on: '2026-10-05T10:00:00', owed: 1250 },
        addresses: [ADDRESS],
        orders: [{ oid: 'o-1', invoice_no: '2610050001', channel: 'POS', status: 'Purchased', payment_status: 'partially_paid', total_amount: 1550, created_on: '2026-10-05T10:00:00' }],
        channels: ['POS', 'ONLINE'],
        activity: [],
        ...over,
    },
});

const open = async (permissions: string[] = ['sales.customer.view', 'sales.customer.edit', 'sales.customer.create']) => {
    await TestBed.configureTestingModule({
        imports: [CustomerDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'c-1']]) } } }, { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.detectChanges();
    return { fixture, http: TestBed.inject(HttpTestingController) };
};

const text = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.textContent ?? '';

describe('CustomerDetailComponent', () => {
    it('shows what the customer owes as a warning, with their addresses and orders', async () => {
        const { fixture, http } = await open();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_CUSTOMER_DETAILS)).flush(details());
        fixture.detectChanges();
        const page = fixture.nativeElement as HTMLElement;
        expect(page.querySelector('[data-stat="owed"] .text-danger')?.textContent).toContain('1,250.00');
        expect(page.querySelector('[data-address="a-1"]')?.textContent).toContain('House 12, Road 4');
        expect(text(fixture)).toContain('2610050001');
    });

    it('shows no address section at all to someone who sells only at the counter', async () => {
        const { fixture, http } = await open();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_CUSTOMER_DETAILS)).flush(details({ addresses: null, channels: ['POS'] }));
        fixture.detectChanges();
        const page = fixture.nativeElement as HTMLElement;
        expect(page.querySelector('[data-detail="addresses"]')).toBeNull();
        expect(page.querySelector('[data-quick="add-address"]')).toBeNull();
        expect(page.querySelector('[data-stat="delivered"]')).toBeNull();
    });

    it('will not save a Watch or a Block without a reason', async () => {
        const { fixture, http } = await open();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_CUSTOMER_DETAILS)).flush(details());
        const page = fixture.componentInstance;
        vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
        page.openFlag();
        page.flagChoice.set('Blocked');
        page.saveFlag();
        http.expectNone((r) => r.url.includes(APIEndpoint.FLAG_CUSTOMER));

        page.flagReason.set('Refused two parcels');
        page.saveFlag();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.FLAG_CUSTOMER)).request.body).toEqual({ oid: 'c-1', flag: 'Blocked', reason: 'Refused two parcels' });
    });

    it('offers no Edit, Flag or address changes to someone who may only look', async () => {
        const { fixture, http } = await open(['sales.customer.view']);
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_CUSTOMER_DETAILS)).flush(details());
        fixture.detectChanges();
        const page = fixture.nativeElement as HTMLElement;
        expect(page.querySelector('[data-quick="edit"]')).toBeNull();
        expect(page.querySelector('[data-quick="flag"]')).toBeNull();
        expect(page.querySelector('[data-address="a-1"] button')).toBeNull();
    });
});
