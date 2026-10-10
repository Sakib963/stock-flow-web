import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ReturnDetails } from '@app/core/models/return.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { ReturnDetailComponent } from './return-detail.component';

const OID = '5a0c6f4e-6c1e-4b8e-9d55-2f7d2a3b9c22';
const LINE = 'line-1';

const record = (over: Partial<ReturnDetails> = {}): ReturnDetails => ({
    oid: OID,
    return_no: '2610050010-R1',
    order_oid: 'order-1',
    invoice_no: '2610050010',
    channel: 'ONLINE',
    order_status: 'Delivered',
    delivery_status: 'Delivered',
    customer_name: 'Person A',
    customer_phone: '01987654321',
    return_reason: 'changed_mind',
    not_delivered_reason: null,
    notes: null,
    status: 'Pending',
    refund_amount: 900,
    refund_delivery_charge: false,
    delivery_charge: 60,
    return_value: 900,
    due_reduction: 0,
    total_units: 1,
    dispose_oid: null,
    created_on: '2026-10-10T10:00:00.000',
    created_by: 'Moderator',
    edited_on: null,
    edited_by: null,
    items: [{ oid: LINE, order_item_oid: 'oi-1', product_oid: 'p-1', product_name: 'Floral Kurti', batch_code: 'B-1', condition: 'Good', action: null, return_quantity: 1, sold_quantity: 1, unit_price: 900, discount: 0, line_refund: 900 }],
    ...over,
});

const open = async (details: ReturnDetails, granted = ['sales.return.view', 'sales.return.confirm', 'sales.return.cancel', 'sales.order.view']) => {
    await TestBed.configureTestingModule({
        imports: [ReturnDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ oid: OID }), data: {} } } }, { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), menu: () => [], business: () => null, user: () => ({ name: 'Manager' }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReturnDetailComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_RETURN_DETAILS)).flush({ code: 200, data: details });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, element: fixture.nativeElement as HTMLElement };
};

const quick = (element: HTMLElement) => [...element.querySelectorAll('[data-quick]')].map((node) => node.getAttribute('data-quick'));

describe('ReturnDetailComponent', () => {
    it('offers Confirm and Cancel only while the return is Pending', async () => {
        const { element } = await open(record());
        expect(quick(element)).toEqual(['confirm', 'cancel', 'order']);
        TestBed.resetTestingModule();
        const done = await open(record({ status: 'Returned' }));
        expect(quick(done.element)).toEqual(['order']);
    });

    it('hides an action from someone without its permission', async () => {
        const { element } = await open(record(), ['sales.return.view']);
        expect(quick(element)).toEqual(['none']);
    });

    it('confirms only after asking inside the same dialog, sending only the conditions that changed', async () => {
        const { page, http } = await open(record());
        page.open('confirm');
        page.setCondition(LINE, 'Damaged');
        page.submitDialog();
        expect(page.confirming()).toBe(true);
        http.expectNone((r) => r.url.includes(APIEndpoint.CONFIRM_RETURN));
        page.submitDialog();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.CONFIRM_RETURN));
        expect(sent.request.body).toEqual({ oid: OID, conditions: [{ oid: LINE, condition: 'Damaged' }] });
        sent.flush({ code: 200, data: {} });
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_RETURN_DETAILS)).flush({ code: 200, data: record({ status: 'Returned' }) });
        expect(page.dialog()).toBeNull();
    });

    it('needs the way the money went back on a counter return with a refund', async () => {
        const { page, http } = await open(record({ channel: 'POS' }));
        page.open('confirm');
        expect(page.dialogIncomplete()).toBe(true);
        page.refundMethod.set('cash');
        page.submitDialog();
        page.submitDialog();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.CONFIRM_RETURN)).request.body).toEqual({ oid: OID, conditions: [], refund_method: 'cash' });
    });

    it('needs a reason to cancel', async () => {
        const { page } = await open(record());
        page.open('cancel');
        expect(page.dialogIncomplete()).toBe(true);
        page.cancelReason.set('Typed against the wrong order');
        expect(page.dialogIncomplete()).toBe(false);
    });

    it('says why a parcel came back', async () => {
        const { element } = await open(record({ return_reason: 'not_delivered', not_delivered_reason: 'refused' }));
        expect(element.querySelector('[data-detail="reason-text"]')?.textContent).toContain('sales.order.notDeliveredReason.refused');
    });
});
