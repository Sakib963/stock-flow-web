import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PosBatch } from '@app/core/models/pos.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { PosComponent } from './pos.component';

const batch = (over: Partial<PosBatch> = {}): PosBatch => ({
    product_oid: 'p-1',
    product_name: 'Floral print kurti',
    image_url: null,
    sku: 'KURTI-38',
    inventory_oid: 'i-1',
    batch_code: 'B-7KQ2-91X',
    expiry_date: null,
    quantity_available: 6,
    sellable_quantity: 2,
    selling_price: 1450,
    maximum_discount: 100,
    ...over,
});

const open = async (canSell = true) => {
    localStorage.setItem('sf.pos.printAfterCheckout', 'no');
    await TestBed.configureTestingModule({
        imports: [PosComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { can: () => canSell, menu: () => [], business: () => ({ name: 'A boutique', address: 'House 5, Dhaka', phone: '01711000000' }), user: () => ({ name: 'Counter Person' }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PosComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    if (canSell) http.expectOne((r) => r.url.includes(APIEndpoint.GET_PARKED_CARTS)).flush({ code: 200, data: [] });
    return { fixture, page: fixture.componentInstance, http };
};

/** Every confirmation is answered yes, as the cashier pressing Checkout in the dialog. */
const answerYes = (fixture: ComponentFixture<PosComponent>) => vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);

describe('PosComponent', () => {
    it('adds a batch once and counts the next scan of it as one more, never past what is left', async () => {
        const { page } = await open();
        page.add(batch());
        page.add(batch());
        page.add(batch());
        expect(page.lines().length).toBe(1);
        expect(page.lines()[0].quantity).toBe(2);
    });

    it('totals the cart with the discount per unit, held to the batch maximum', async () => {
        const { page } = await open();
        page.add(batch({ sellable_quantity: 5 }));
        page.setQuantity(0, 3);
        page.setDiscount(0, 500);
        expect(page.lines()[0].discount).toBe(100);
        expect([page.subtotal(), page.discountTotal(), page.total()]).toEqual([4350, 300, 4050]);
    });

    it('says why Checkout waits: an empty cart, a half-typed phone, a new customer with no name', async () => {
        const { page, http } = await open();
        expect(page.blocker()).toBe('sales.pos.blocker.empty');
        page.add(batch());
        expect(page.blocker()).toBeNull();

        page.phone.set('01711');
        expect(page.blocker()).toBe('sales.pos.blocker.phone');

        page.phone.set('০১৭১১০০০০০০');
        TestBed.tick();
        http.expectOne((r) => r.url.includes(APIEndpoint.FIND_CUSTOMER_BY_PHONE) && r.body.phone === '01711000000').flush({ code: 200, data: { phone: '01711000000', customer: null } });
        expect(page.blocker()).toBe('sales.pos.blocker.name');
        page.customerName.set('Person B');
        expect(page.blocker()).toBeNull();
    });

    it('refuses change that is short of the total for a cash sale', async () => {
        const { page } = await open();
        page.add(batch());
        page.received.set(1000);
        expect(page.change()).toBe(-450);
        expect(page.blocker()).toBe('sales.pos.blocker.received');
        page.received.set(2000);
        expect(page.change()).toBe(550);
        expect(page.blocker()).toBeNull();
    });

    it('sends the cart under its own oid with only batch, quantity and discount, then opens a new cart', async () => {
        const { fixture, page, http } = await open();
        page.add(batch());
        const oid = page.cartOid();
        answerYes(fixture);
        page.checkout();

        const request = http.expectOne((r) => r.url.includes(APIEndpoint.CHECKOUT_POS_SALE));
        expect(request.request.body).toEqual({ oid, customer: undefined, payment_method: 'cash', payment_reference: null, payment_status: 'paid', amount_paid: undefined, total_amount: 1450, lines: [{ inventory_oid: 'i-1', quantity: 1, discount: 0 }] });
        request.flush({ code: 200, data: { oid, invoice_no: '2610040001', total_amount: 1450, amount_paid: 1450 } });
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_PARKED_CARTS)).flush({ code: 200, data: [] });

        expect(page.lines()).toEqual([]);
        expect(page.cartOid()).not.toBe(oid);
        const receipt = page.lastReceipt()!;
        expect(receipt.meta[0][1]).toBe('2610040001');
        expect(receipt.lines.length).toBe(1);
        expect(receipt.business).toBe('A boutique');
    });

    it('keeps the cart and marks the line when another counter sold the stock first', async () => {
        const { fixture, page, http } = await open();
        page.add(batch());
        page.add(batch());
        answerYes(fixture);
        page.checkout();

        http.expectOne((r) => r.url.includes(APIEndpoint.CHECKOUT_POS_SALE)).flush({ code: 409, message: 'Only 1 left', data: { inventory_oid: 'i-1', sellable: 1 } }, { status: 409, statusText: 'Conflict' });

        expect(page.lines()[0].sellable).toBe(1);
        expect(page.blocker()).toBe('sales.pos.blocker.stock');
    });

    it('resumes a parked cart only onto an empty screen', async () => {
        const { page } = await open();
        const parked = { oid: 'c-1', invoice_no: '2610040002', draft_label: 'Lady in blue', customer_name: null, customer_phone: null, total_amount: 1450, created_on: '2026-10-04T08:00:00', parked_by: 'Owner', lines: [{ inventory_oid: 'i-2', product_oid: 'p-2', product_name: 'Cotton scarf', batch_code: 'B-2M4D-0PL', expiry_date: null, selling_price: 600, maximum_discount: 50, sellable: 12, quantity: 2, discount: 0 }] };
        page.add(batch());
        expect(page.canResume(parked)).toBe(false);
        page.remove(0);
        page.resume(parked);
        expect(page.cartOid()).toBe('c-1');
        expect(page.lines().map((line) => line.batch_code)).toEqual(['B-2M4D-0PL']);
    });

    it('lets someone who may only open the counter look products up, with no payment, park or parked carts', async () => {
        const { fixture, http } = await open(false);
        http.verify();
        const html = fixture.nativeElement as HTMLElement;
        expect(html.querySelector('[data-pos="search"]')).not.toBeNull();
        expect(html.querySelector('[data-pos="payment"]')).toBeNull();
        expect(html.querySelector('[data-pos="parked"]')).toBeNull();
    });

    it('shows the prices the server will accept when one changed while the cart was open', async () => {
        const { fixture, page, http } = await open();
        page.add(batch());
        answerYes(fixture);
        page.checkout();
        http.expectOne((r) => r.url.includes(APIEndpoint.CHECKOUT_POS_SALE)).flush({ code: 409, message: 'changed', data: { total_amount: 1550, lines: [{ inventory_oid: 'i-1', unit_price: 1550 }] } }, { status: 409, statusText: 'Conflict' });
        expect(page.total()).toBe(1550);
        expect(page.lines().length).toBe(1);
    });

    it('keeps the cart and never claims nothing was sold when a Checkout got no answer', async () => {
        const { fixture, page, http } = await open();
        page.add(batch());
        const oid = page.cartOid();
        answerYes(fixture);
        page.checkout();
        http.expectOne((r) => r.url.includes(APIEndpoint.CHECKOUT_POS_SALE)).error(new ProgressEvent('error'), { status: 0 });
        expect(page.unanswered()).toBe(true);
        expect(page.cartOid()).toBe(oid);
        expect(page.lines().length).toBe(1);
    });

    it('sends the typed name when the phone could not be looked up', async () => {
        const { fixture, page, http } = await open();
        page.add(batch());
        page.phone.set('01711000000');
        TestBed.tick();
        http.expectOne((r) => r.url.includes(APIEndpoint.FIND_CUSTOMER_BY_PHONE)).error(new ProgressEvent('error'), { status: 0 });
        page.customerName.set('Person B');
        answerYes(fixture);
        page.checkout();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.CHECKOUT_POS_SALE)).request.body.customer).toEqual({ phone: '01711000000', name: 'Person B' });
    });

    it('asks for the customer phone before a sale on credit', async () => {
        const { page } = await open();
        page.add(batch());
        page.setStatus('unpaid');
        expect(page.blocker()).toBe('sales.pos.blocker.creditNeedsPhone');
        page.setStatus('paid');
        expect(page.blocker()).toBeNull();
    });
});
