import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CustomerAddress } from '@app/core/models/customer.model';
import { OnlineOrderSetup, PlaceCandidate } from '@app/core/models/online-order.model';
import { PosBatch } from '@app/core/models/pos.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { OnlineOrderComponent } from './online-order.component';

const SETUP: OnlineOrderSetup = { sources: [{ oid: 's-1', platform: 'Facebook', name: 'Facebook page' }], delivery_charge_inside: 60, delivery_charge_outside: 120, home_district: { oid: 'BD-Dhaka', name_en: 'Dhaka', name_bn: 'ঢাকা' }, logo_url: null };

const batch = (over: Partial<PosBatch> = {}): PosBatch => ({ product_oid: 'p-1', product_name: 'Floral print kurti', image_url: null, sku: 'KURTI-38', inventory_oid: 'i-1', batch_code: 'B-7KQ2-91X', expiry_date: null, quantity_available: 6, sellable_quantity: 4, selling_price: 1450, maximum_discount: 100, ...over });

const place = (district: string, thana: string, rank: number): PlaceCandidate => ({ rank, district: { oid: `BD-${district}`, name_en: district, name_bn: district }, thana: { oid: `T-${district}`, name_en: thana, name_bn: thana, type: 'Thana' }, area: null, reasons: [] });

const saved = (over: Partial<CustomerAddress> = {}): CustomerAddress => ({ oid: 'a-1', label: 'Home', recipient_name: 'Person A', recipient_phone: null, address_line: '5/5 Gaznabi Road', district_oid: 'BD-Magura', district_name_en: 'Magura', district_name_bn: 'মাগুরা', thana_oid: 'T-Magura', thana_name_en: 'Mohammadpur', thana_name_bn: 'মোহাম্মদপুর', area_text: null, postal_code: null, is_default: true, ...over });

const open = async (canCreate = true, keep = false) => {
    if (!keep) localStorage.removeItem('sf.online.unsent');
    await TestBed.configureTestingModule({
        imports: [OnlineOrderComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { can: (code: string) => code !== 'sales.online.create' || canCreate, menu: () => [], business: () => null, user: () => ({ name: 'Moderator' }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(OnlineOrderComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_ONLINE_ORDER_SETUP)).flush({ code: 200, data: SETUP });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, element: fixture.nativeElement as HTMLElement };
};

const answerYes = (fixture: ComponentFixture<OnlineOrderComponent>, answer = true) => vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(answer) }) as unknown as NzModalRef);

/** A returning customer with one saved address, so the order is ready but for its products. */
const knownCustomer = (page: OnlineOrderComponent, http: HttpTestingController, address = saved()) => {
    page.phone.set('01987654321');
    TestBed.tick();
    http.expectOne((r) => r.url.includes(APIEndpoint.FIND_CUSTOMER_BY_PHONE)).flush({ code: 200, data: { phone: '01987654321', customer: { oid: 'c-1', name: 'Person A', phone: '01987654321', gender: null, age_band: null, flag: 'None', flag_reason: null, status: 'Active' }, addresses: [address], last_orders: [] } });
    TestBed.tick();
};

describe('OnlineOrderComponent', () => {
    it('fills phone, name and address from a pasted message and takes the one place clearly ahead', async () => {
        const { page, http } = await open();
        page.pasteText.set('person a, 01987654321, 5/5, gaznabi road, mohammadpur');
        page.readMessage();
        http.expectOne((r) => r.url.includes(APIEndpoint.READ_CHAT_MESSAGE)).flush({ code: 200, data: { phone: '01987654321', other_phones: [], name: 'Person A', address_line: '5/5, gaznabi road, mohammadpur', location: { postal_code: null, candidates: [place('Dhaka', 'Mohammadpur', 1), place('Magura', 'Mohammadpur', 2)] }, lookup: null } });
        TestBed.tick();
        http.expectOne((r) => r.url.includes(APIEndpoint.FIND_CUSTOMER_BY_PHONE)).flush({ code: 200, data: { phone: '01987654321', customer: null } });
        TestBed.tick();

        expect([page.phone(), page.customerName()]).toEqual(['01987654321', 'Person A']);
        expect(page.addressChoice()).toBe('new');
        expect(page.newAddress()).toMatchObject({ recipient_name: 'Person A', address_line: '5/5, gaznabi road, mohammadpur', district_oid: 'BD-Dhaka', thana_oid: 'T-Dhaka' });
    });

    it('sends a new address read from a message as an address, never as a saved one', async () => {
        const { fixture, page, http } = await open();
        page.pasteText.set('person a, 01987654321, 5/5, gaznabi road, mohammadpur');
        page.readMessage();
        http.expectOne((r) => r.url.includes(APIEndpoint.READ_CHAT_MESSAGE)).flush({ code: 200, data: { phone: '01987654321', other_phones: [], name: 'Person A', address_line: '5/5, gaznabi road', location: { postal_code: '1207', candidates: [place('Dhaka', 'Mohammadpur', 1)] }, lookup: null } });
        TestBed.tick();
        http.expectOne((r) => r.url.includes(APIEndpoint.FIND_CUSTOMER_BY_PHONE)).flush({ code: 200, data: { phone: '01987654321', customer: null } });
        TestBed.tick();
        page.add(batch());
        answerYes(fixture);
        page.create();
        const { address } = http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_ONLINE_ORDER)).request.body;
        expect(address).toEqual({ label: null, recipient_name: 'Person A', recipient_phone: null, address_line: '5/5, gaznabi road', district_oid: 'BD-Dhaka', thana_oid: 'T-Dhaka', area_text: null, postal_code: '1207', is_default: false });
    });

    it('takes a returning customer’s saved address when the message names it again, instead of saving a second copy', async () => {
        const { page, http } = await open();
        knownCustomer(page, http, saved({ address_line: '5/5 Gaznabi Road', district_oid: 'BD-Dhaka', thana_oid: 'T-Dhaka' }));
        page.pasteText.set('01987654321, 5/5, gaznabi road, mohammadpur');
        page.readMessage();
        http.expectOne((r) => r.url.includes(APIEndpoint.READ_CHAT_MESSAGE)).flush({ code: 200, data: { phone: '01987654321', other_phones: [], name: null, address_line: '5/5, gaznabi road', location: { postal_code: null, candidates: [place('Dhaka', 'Mohammadpur', 1)] }, lookup: { customer: { name: 'Person A' } } } });
        expect(page.addressChoice()).toBe('a-1');
        expect(page.newAddress()).toBeNull();
    });

    it('never picks a place on a tie: the moderator taps one', async () => {
        const { page, http } = await open();
        page.pasteText.set('person a, 01987654321, mohammadpur');
        page.readMessage();
        http.expectOne((r) => r.url.includes(APIEndpoint.READ_CHAT_MESSAGE)).flush({ code: 200, data: { phone: null, other_phones: [], name: 'Person A', address_line: 'mohammadpur', location: { postal_code: null, candidates: [place('Dhaka', 'Mohammadpur', 1), place('Magura', 'Mohammadpur', 1)] }, lookup: null } });
        expect(page.addressChoice()).toBeNull();
        page.customerName.set('Person A');
        page.useCandidate(page.pasted()!.candidates[1]);
        expect(page.newAddress()?.district_oid).toBe('BD-Magura');
    });

    it('suggests the delivery charge from the district, inside or outside the business’s own, and keeps one typed by hand', async () => {
        const { page, http } = await open();
        knownCustomer(page, http);
        expect(page.deliveryCharge()).toBe(120);
        page.setCharge(90);
        expect(page.deliveryCharge()).toBe(90);
    });

    it('says why Create waits, ending with where the order came from', async () => {
        const { page, http } = await open();
        expect(page.blocker()).toBe('sales.online.blocker.phone');
        knownCustomer(page, http);
        expect(page.blocker()).toBe('sales.online.blocker.empty');
        page.add(batch());
        page.sourceOid.set(null);
        expect(page.blocker()).toBe('sales.online.blocker.source');
        page.sourceOid.set('s-1');
        page.setPaymentType('ADVANCE');
        expect(page.blocker()).toBe('sales.online.blocker.advance');
        page.advance.set(page.total());
        expect(page.blocker()).toBe('sales.online.blocker.advance');
        page.advance.set(120);
        expect(page.blocker()).toBeNull();
    });

    it('sends the batch, quantity and per unit discount, a saved address by its oid, and the advance with its method', async () => {
        const { fixture, page, http } = await open();
        knownCustomer(page, http);
        page.add(batch());
        page.add(batch());
        page.setDiscount(0, 50);
        page.setPaymentType('ADVANCE');
        page.advance.set(120);
        answerYes(fixture);
        page.create();

        const request = http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_ONLINE_ORDER));
        expect(request.request.body).toMatchObject({ oid: page.orderOid(), address: { oid: 'a-1' }, source_oid: 's-1', payment_type: 'ADVANCE', payment_method: 'bkash', amount_paid: 120, delivery_charge: 120, total_amount: 2800 + 120, lines: [{ inventory_oid: 'i-1', quantity: 2, discount: 50 }] });
        request.flush({ code: 200, data: { oid: page.orderOid(), invoice_no: '2610050001', customer_oid: 'c-1', total_amount: 2920, amount_paid: 120 } });
        expect(page.done()).toMatchObject({ invoice_no: '2610050001', total: 2920, collect: 2800 });
    });

    it('keeps the same order on a Create that got no answer, so pressing again cannot place it twice', async () => {
        const { fixture, page, http } = await open();
        knownCustomer(page, http);
        page.add(batch());
        answerYes(fixture);
        const oid = page.orderOid();
        page.create();
        http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_ONLINE_ORDER)).error(new ProgressEvent('error'), { status: 0 });
        expect(page.unanswered()).toBe(true);
        page.create();
        const again = http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_ONLINE_ORDER));
        expect(again.request.body.oid).toBe(oid);
        again.flush({ code: 409, message: 'already placed', data: { invoice_no: '2610050001', status: 'Pending' } }, { status: 409, statusText: 'Conflict' });
        expect(page.done()?.invoice_no).toBe('2610050001');
    });

    it('marks a line that ran out with what is left', async () => {
        const { fixture, page, http } = await open();
        knownCustomer(page, http);
        page.add(batch());
        answerYes(fixture);
        page.create();
        http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_ONLINE_ORDER)).flush({ code: 409, data: { inventory_oid: 'i-1', sellable: 0 } }, { status: 409, statusText: 'Conflict' });
        expect(page.lines()[0].sellable).toBe(0);
        expect(page.blocker()).toBe('sales.online.blocker.stock');
    });

    it('asks for the tick before ordering for a blocked customer', async () => {
        const { page, http } = await open();
        page.phone.set('01987654321');
        TestBed.tick();
        http.expectOne((r) => r.url.includes(APIEndpoint.FIND_CUSTOMER_BY_PHONE)).flush({ code: 200, data: { phone: '01987654321', customer: { oid: 'c-1', name: 'Person A', phone: '01987654321', gender: null, age_band: null, flag: 'Blocked', flag_reason: 'Refused two parcels', status: 'Active' }, addresses: [saved()], last_orders: [] } });
        TestBed.tick();
        page.add(batch());
        expect(page.blocker()).toBe('sales.online.blocker.blocked');
        page.blockedAcknowledged.set(true);
        expect(page.blocker()).toBeNull();
    });

    it('says what is missing when Create is pressed too early, and lights that part of the page', async () => {
        const { page, http } = await open();
        knownCustomer(page, http);
        page.create();
        expect(page.attention()).toBe('products');
        http.expectNone((r) => r.url.includes(APIEndpoint.CREATE_ONLINE_ORDER));
    });

    it('keeps the invoice of the order just placed for printing', async () => {
        const { fixture, page, http } = await open();
        knownCustomer(page, http);
        page.add(batch());
        answerYes(fixture);
        page.create();
        http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_ONLINE_ORDER)).flush({ code: 200, data: { oid: page.orderOid(), invoice_no: '2610050001', customer_oid: 'c-1', total_amount: 1570, amount_paid: 0 } });
        expect(page.lastInvoice()).toMatchObject({ meta: [[expect.any(String), '2610050001'], expect.anything()], shipTo: { lines: ['Person A', '01987654321', expect.stringContaining('5/5 Gaznabi Road')] } });
    });

    it('brings the order on screen back after a reload, and forgets it once cleared', async () => {
        const first = await open();
        knownCustomer(first.page, first.http);
        first.page.add(batch());
        first.page.notes.set('Ring before coming');
        TestBed.tick();
        const oid = first.page.orderOid();
        TestBed.resetTestingModule();
        const again = await open(true, true);
        expect([again.page.orderOid(), again.page.phone(), again.page.lines().length, again.page.notes()]).toEqual([oid, '01987654321', 1, 'Ring before coming']);
        again.page.newOrder();
        TestBed.tick();
        expect(localStorage.getItem('sf.online.unsent')).toBeNull();
    });

    it('asks before saving a draft, and saves nothing when the answer is no', async () => {
        const { fixture, page, http } = await open();
        knownCustomer(page, http);
        page.add(batch());
        answerYes(fixture, false);
        page.saveDraft();
        http.expectNone((r) => r.url.includes(APIEndpoint.SAVE_ONLINE_DRAFT));
        expect(page.lines().length).toBe(1);
    });

    it('shows an empty source as an error under its field, not as a message', async () => {
        const { fixture, page, http, element } = await open();
        const warning = vi.spyOn(fixture.debugElement.injector.get(NzMessageService), 'warning');
        knownCustomer(page, http);
        page.add(batch());
        page.sourceOid.set(null);
        expect(page.missing('source')).toBe(false);
        page.create();
        fixture.detectChanges();
        expect(page.missing('source')).toBe(true);
        expect(warning).not.toHaveBeenCalled();
        expect(element.querySelector('[data-online="summary"] .ant-form-item-has-error')).not.toBeNull();
        http.expectNone((r) => r.url.includes(APIEndpoint.CREATE_ONLINE_ORDER));
    });

    it('saves a half-made order as a draft and resumes it under the same oid', async () => {
        const { fixture, page, http } = await open();
        knownCustomer(page, http);
        page.add(batch());
        const oid = page.orderOid();
        answerYes(fixture);
        page.saveDraft();
        const saved = http.expectOne((r) => r.url.includes(APIEndpoint.SAVE_ONLINE_DRAFT));
        expect(saved.request.body).toMatchObject({ oid, customer: { phone: '01987654321' }, address: { oid: 'a-1' }, lines: [{ inventory_oid: 'i-1', quantity: 1, discount: 0 }] });
        saved.flush({ code: 200, data: { oid, invoice_no: '2610050009' } });
        expect(page.lines().length).toBe(0);

        page.openDrafts();
        const draft = { oid, invoice_no: '2610050009', draft_label: 'Person A', customer_name: 'Person A', customer_phone: '01987654321', notes: null, payment_type: 'COD', delivery_charge: 120, total_amount: 1570, created_on: new Date().toISOString(), saved_by: null, source_oid: 's-1', customer_address_oid: 'a-1', recipient_name: null, recipient_phone: null, address_line: null, area_text: null, postal_code: null, district_oid: null, district_name_en: null, district_name_bn: null, thana_oid: null, thana_name_en: null, thana_name_bn: null, lines: [{ ...batch(), sellable: 4, quantity: 1, discount: 0 }] };
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_ONLINE_DRAFTS)).flush({ code: 200, data: [draft] });
        page.resume(draft as never);
        expect([page.orderOid(), page.lines().length, page.deliveryCharge()]).toEqual([oid, 1, 120]);
    });

    it('shows no Create to someone who may only open the page', async () => {
        const { element } = await open(false);
        expect(element.querySelector('[data-online="create"]')).toBeNull();
    });
});
