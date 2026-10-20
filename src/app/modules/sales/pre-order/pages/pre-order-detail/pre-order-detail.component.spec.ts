import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PreOrderDetails } from '@app/core/models/pre-order.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { PreOrderDetailComponent } from './pre-order-detail.component';

const OID = '0f3b7c2e-5a1d-4c8e-9b77-3e2a1d4c5b6a';
const ALL = ['sales.pre-order.view', 'sales.pre-order.edit', 'sales.pre-order.confirm', 'sales.pre-order.cancel'];

const record = (over: Partial<PreOrderDetails> = {}): PreOrderDetails => ({
    oid: OID,
    preorder_no: 'PRE-2610-0001',
    customer_oid: 'c-1',
    customer_name: 'Nusrat',
    customer_phone: '01711000111',
    status: 'Pending',
    total_amount: 3000,
    advance_paid: 500,
    advance_method: 'bkash',
    advance_reference: null,
    advance_refund_due: 0,
    advance_refunded: 0,
    refunded_on: null,
    expected_date: '2026-11-01',
    notes: null,
    cancel_reason: null,
    cancel_note: null,
    converted_order_oid: null,
    converted_invoice_no: null,
    created_on: '2026-10-11T10:00:00.000',
    created_by: 'Owner',
    lines: [{ oid: 'l-1', product_oid: 'p-kurti', product_name: 'Block print kurti', sku: 'KURTI-1', quantity: 2, unit_price: 1500, total: 3000, sellable: 0, usual_price: null, sales: 0, last_price: null, price_from: null, price_to: null }],
    activity: [{ title: 'Booking saved', description: 'PRE-2610-0001 for Nusrat, 1 line(s)', performed_by: 'Owner', performed_on: '2026-10-11T10:00:00.000' }],
    ...over,
});

const open = async (details: PreOrderDetails, granted = ALL) => {
    await TestBed.configureTestingModule({
        imports: [PreOrderDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ oid: OID }), data: {} } } }, { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), menu: () => [], business: () => null, user: () => ({ name: 'Owner' }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PreOrderDetailComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_PRE_ORDER_DETAILS)).flush({ code: 200, data: details });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, element: fixture.nativeElement as HTMLElement };
};

const quick = (element: HTMLElement) => [...element.querySelectorAll('[data-quick]')].map((node) => node.getAttribute('data-quick'));

describe('PreOrderDetailComponent', () => {
    it('marks a product out of stock, or short of what was booked, beside its name', async () => {
        const lines = [{ ...record().lines[0], oid: 'l-1', sellable: 0 }, { ...record().lines[0], oid: 'l-2', product_oid: 'p-bag', sellable: 1 }, { ...record().lines[0], oid: 'l-3', product_oid: 'p-scarf', sellable: 5 }];
        const { element } = await open(record({ lines }));
        const mark = (id: string) => element.querySelector('[data-line="' + id + '"] [data-stock]')?.getAttribute('data-stock') ?? null;
        expect([mark('p-kurti'), mark('p-bag'), mark('p-scarf')]).toEqual(['out', 'short', null]);
    });

    it('offers each action only in the state and to the person it belongs to', async () => {
        expect(quick((await open(record())).element)).toEqual(['confirm', 'edit', 'cancel']);
        TestBed.resetTestingModule();
        expect(quick((await open(record({ status: 'Confirmed' }))).element)).toEqual(['edit', 'cancel']);
        TestBed.resetTestingModule();
        expect(quick((await open(record({ status: 'Cancelled', cancel_reason: 'stock_not_coming', advance_refund_due: 500 }))).element)).toEqual(['refund']);
        TestBed.resetTestingModule();
        expect(quick((await open(record({ status: 'Converted', converted_order_oid: 'o-1', converted_invoice_no: 'INV-2610-0042' }))).element)).toEqual(['none']);
        TestBed.resetTestingModule();
        expect(quick((await open(record(), ['sales.pre-order.view'])).element)).toEqual(['none']);
    });

    it('cancels with a reason, a note for Other, and the advance to give back, which starts at all of it', async () => {
        const { page, http } = await open(record());
        page.openCancel();
        expect(page.refundDue()).toBe(500);
        page.cancelReason.set('other');
        expect(page.cancelReady()).toBe(false);
        page.cancelNote.set('Booked twice');
        page.refundDue.set(300);
        page.submitCancel();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.CANCEL_PRE_ORDER));
        expect(sent.request.body).toEqual({ oid: OID, reason: 'other', note: 'Booked twice', refund_due: 300 });
        sent.flush({ code: 200, data: { oid: OID } });
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_PRE_ORDER_DETAILS)).flush({ code: 200, data: record({ status: 'Cancelled', cancel_reason: 'other', cancel_note: 'Booked twice', advance_refund_due: 300 }) });
        expect(page.cancelling()).toBe(false);
        expect(page.refundOwed()).toBe(300);
    });

    it('never lets the refund be more than the advance', async () => {
        const { page } = await open(record());
        page.openCancel();
        page.cancelReason.set('changed_mind');
        page.refundDue.set(600);
        expect(page.cancelReady()).toBe(false);
    });
});
