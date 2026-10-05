import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OrderDetails } from '@app/core/models/order.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { OrderDetailComponent } from './order-detail.component';

const OID = '0b6f6f4e-6c1e-4b8e-9d55-2f7d2a3b9c11';

const order = (over: Partial<OrderDetails> = {}): OrderDetails => ({
    oid: OID,
    invoice_no: '2610050001',
    channel: 'ONLINE',
    status: 'Pending',
    customer_oid: 'c-1',
    customer_name: 'Person A',
    customer_phone: '01987654321',
    subtotal: 2900,
    discount_total: 0,
    delivery_charge: 60,
    total_amount: 2960,
    amount_paid: 0,
    amount_refunded: 0,
    payment_type: 'COD',
    payment_method: 'cod',
    payment_status: 'unpaid',
    refund_status: 'None',
    refund_due: 0,
    dispatched_on: null,
    delivered_on: null,
    cancelled_on: null,
    cancel_reason_code: null,
    cancel_reason: null,
    sold_on: null,
    notes: null,
    created_by: 'm@x.test',
    created_by_name: 'Moderator',
    created_on: '2026-10-05T10:00:00.000',
    items: [{ oid: 'l-1', product_oid: 'p-1', product_name: 'Floral kurti', batch_code: 'B-1', quantity: 2, returned_qty: 0, unit_price: 1450, discount: 0, total: 2900 }],
    status_history: [{ kind: 'Order', from_status: null, to_status: 'Pending', reason: null, performed_by: 'm@x.test', performed_by_name: 'Moderator', performed_on: '2026-10-05T10:00:00.000' }],
    online: { recipient_name: 'Person A', recipient_phone: null, address_line: '5/5 Gaznabi Road', area_text: null, postal_code: null, district_name_en: 'Dhaka', district_name_bn: 'ঢাকা', thana_name_en: 'Mohammadpur', thana_name_bn: 'মোহাম্মদপুর', source_name: 'Facebook page', confirmed_via: null, confirmed_note: null, confirmed_on: null, confirmed_by: null, risk_own_delivered_rate: null, risk_flag: 'None', delivery_status: null, packed_on: null, courier: null, consignment_no: null },
    ...over,
});

const open = async (details: OrderDetails, granted: string[] = ['sales.order.view', 'sales.order.confirm', 'sales.order.cancel', 'sales.order.dispatch', 'sales.order.deliver']) => {
    await TestBed.configureTestingModule({
        imports: [OrderDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ oid: OID }) } } }, { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), menu: () => [], business: () => null, user: () => ({ name: 'Manager' }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(OrderDetailComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_ORDER_DETAILS)).flush({ code: 200, data: details });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, element: fixture.nativeElement as HTMLElement };
};

const answer = (fixture: ComponentFixture<OrderDetailComponent>, yes = true) => vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(yes) }) as unknown as NzModalRef);
const quick = (element: HTMLElement) => [...element.querySelectorAll('[data-quick]')].map((node) => node.getAttribute('data-quick'));

describe('OrderDetailComponent', () => {
    it('offers Confirm and Cancel on a Pending online order, and nothing that comes later', async () => {
        const { element } = await open(order());
        expect(quick(element)).toEqual(['confirm', 'cancel']);
    });

    it('offers Deliver and Not delivered once the parcel is with the courier, and no Cancel', async () => {
        const { element } = await open(order({ status: 'Confirmed', dispatched_on: '2026-10-05T12:00:00.000', online: { ...order().online!, delivery_status: 'WithCourier' } }));
        expect(quick(element)).toEqual(['deliver', 'not-delivered']);
    });

    it('hides an action from someone without its permission', async () => {
        const { element } = await open(order({ status: 'Confirmed', online: { ...order().online!, delivery_status: 'Preparing' } }), ['sales.order.view']);
        expect(quick(element)).toEqual(['none']);
    });

    it('offers nothing on a counter sale, which only a return can undo', async () => {
        const { element } = await open(order({ channel: 'POS', status: 'Purchased', online: null }));
        expect(quick(element)).toEqual(['none']);
    });

    it('confirms only after it is asked, with how it was checked, and reloads the order', async () => {
        const { fixture, page, http } = await open(order());
        answer(fixture, false);
        page.open('confirm');
        page.confirmedVia.set('Message');
        page.submitDialog();
        http.expectNone((r) => r.url.includes(APIEndpoint.CONFIRM_ORDER));

        answer(fixture);
        page.submitDialog();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.CONFIRM_ORDER));
        expect(sent.request.body).toEqual({ oid: OID, confirmed_via: 'Message', note: null });
        sent.flush({ code: 200, data: { oid: OID } });
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_ORDER_DETAILS)).flush({ code: 200, data: order({ status: 'Confirmed' }) });
        expect(page.dialog()).toBeNull();
    });

    it('needs a reason to cancel, and a note when the reason is Other', async () => {
        const { page } = await open(order());
        page.open('cancel');
        expect(page.dialogIncomplete()).toBe(true);
        page.cancelReason.set('other');
        expect(page.dialogIncomplete()).toBe(true);
        page.note.set('Customer asked by phone');
        expect(page.dialogIncomplete()).toBe(false);
    });

    it('reloads and says what changed when someone else moved the order first', async () => {
        const { fixture, page, http } = await open(order());
        answer(fixture);
        page.open('confirm');
        page.submitDialog();
        http.expectOne((r) => r.url.includes(APIEndpoint.CONFIRM_ORDER)).flush({ code: 409, message: 'Already confirmed' }, { status: 409, statusText: 'Conflict' });
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_ORDER_DETAILS)).flush({ code: 200, data: order({ status: 'Confirmed' }) });
        expect(page.record()?.status).toBe('Confirmed');
    });
});
