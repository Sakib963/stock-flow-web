import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PreOrderDetails } from '@app/core/models/pre-order.model';
import { PreOrderFormComponent } from './pre-order-form.component';

const NO_HISTORY = { usual_price: null, sales: 0, last_price: null, price_from: null, price_to: null };
const KURTI = { product_oid: 'p-kurti', product_name: 'Block print kurti', sku: 'KURTI-1', sellable: 0, price: 1500, ...NO_HISTORY };
const SCARF = { product_oid: 'p-scarf', product_name: 'Silk scarf', sku: null, sellable: 4, price: 1600, usual_price: 1400, sales: 3, last_price: 1450, price_from: 1450, price_to: 1450 };

const open = async (editing?: PreOrderDetails) => {
    await TestBed.configureTestingModule({
        imports: [PreOrderFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(PreOrderFormComponent);
    if (editing) fixture.componentRef.setInput('editing', editing);
    fixture.detectChanges();
    return { fixture, form: fixture.componentInstance, http: TestBed.inject(HttpTestingController), element: fixture.nativeElement as HTMLElement };
};

const lookUp = (http: HttpTestingController, name: string | null, open: object[] = []) => {
    http.expectOne((r) => r.url.includes(APIEndpoint.FIND_CUSTOMER_BY_PHONE)).flush({ code: 200, data: { phone: '01711000111', customer: name ? { oid: 'c-1', name, flag: 'None' } : null } });
    if (name) http.expectOne((r) => r.url.includes(APIEndpoint.FIND_OPEN_BOOKINGS)).flush({ code: 200, data: open });
};

describe('PreOrderFormComponent', () => {
    it('asks a new phone for a name, and sends the booking at its approximate price with no advance method', async () => {
        const { form, http } = await open();
        form.products.set([KURTI]);
        form.add(KURTI.product_oid);
        form.form.patchValue({ phone: '+৮৮০১৭১১-০০০১১১' });
        lookUp(http, null);
        expect(form.valid()).toBe(false);

        form.form.patchValue({ name: ' Nusrat ' });
        expect(form.valid()).toBe(true);
        expect(form.payload('b-1')).toEqual({ oid: 'b-1', customer: { phone: '01711000111', name: 'Nusrat' }, lines: [{ product_oid: 'p-kurti', quantity: 1, unit_price: 1500 }], advance_paid: 0, advance_method: null, advance_reference: null, expected_date: null, notes: null });
    });

    it('never takes a failed phone lookup for a new customer, and waits to save until it is checked', async () => {
        const { form, http } = await open();
        form.products.set([KURTI]);
        form.add(KURTI.product_oid);
        form.form.patchValue({ phone: '01711000111', name: 'Nusrat' });
        http.expectOne((r) => r.url.includes(APIEndpoint.FIND_CUSTOMER_BY_PHONE)).flush({ message: 'down' }, { status: 500, statusText: 'Server Error' });
        expect(form.known()).toBeUndefined();
        expect(form.lookupFailed()).toBe(true);
        expect(form.valid()).toBe(false);
        form.retryLookup();
        lookUp(http, 'Nusrat');
        expect(form.valid()).toBe(true);
    });

    it('needs no name for a known customer, but a method for an advance, and no advance above the total', async () => {
        const { form, http } = await open();
        form.products.set([KURTI]);
        form.add(KURTI.product_oid);
        form.form.patchValue({ phone: '01711000111' });
        lookUp(http, 'Nusrat');
        form.form.patchValue({ advance_paid: 500 });
        expect(form.valid()).toBe(false);
        form.form.patchValue({ advance_method: 'bkash' });
        expect(form.valid()).toBe(true);
        form.form.patchValue({ advance_paid: 2000 });
        expect(form.valid()).toBe(false);
    });

    it('keeps a confirmed booking’s products and units, and leaves its prices open', async () => {
        const { fixture, element, form } = await open({
            oid: 'b-1',
            preorder_no: 'PRE-2610-0001',
            customer_oid: 'c-1',
            customer_name: 'Nusrat',
            customer_phone: '01711000111',
            status: 'Confirmed',
            total_amount: 3000,
            advance_paid: 0,
            advance_method: null,
            advance_reference: null,
            advance_refund_due: 0,
            advance_refunded: 0,
            refunded_on: null,
            expected_date: null,
            notes: null,
            cancel_reason: null,
            cancel_note: null,
            converted_order_oid: null,
            converted_invoice_no: null,
            created_on: '2026-10-11T10:00:00.000',
            created_by: 'Owner',
            lines: [{ oid: 'l-1', product_oid: 'p-kurti', product_name: 'Block print kurti', sku: 'KURTI-1', quantity: 2, unit_price: 1500, total: 3000, sellable: 0, ...NO_HISTORY }],
            activity: [],
        });
        fixture.detectChanges();
        expect(form.locked()).toBe(true);
        expect(element.querySelector('[data-pre-order="product-search"]')).toBeNull();
        expect(element.querySelector('[data-pre-order="locked"]')).not.toBeNull();
        expect(element.querySelectorAll('[data-line] button').length).toBe(0);
        form.setPrice(0, 1400);
        expect(form.total()).toBe(2800);
        expect(form.dirty()).toBe(true);
    });

    it('starts a product at what customers usually paid, and a hint tap uses another price', async () => {
        const { fixture, form, element } = await open();
        form.products.set([SCARF]);
        form.add(SCARF.product_oid);
        expect(form.lines()[0].unit_price).toBe(1400);
        fixture.detectChanges();
        const now = element.querySelector<HTMLButtonElement>('[data-hint="now"]')!;
        expect(now.textContent).toContain('sales.preOrder.hint.now');
        now.click();
        expect(form.lines()[0].unit_price).toBe(1450);
        expect(element.querySelector('[data-pre-order="ready"]')).not.toBeNull();
    });

    it('fills the advance as half or all of the total, and shows what is left to collect', async () => {
        const { form } = await open();
        form.products.set([SCARF]);
        form.add(SCARF.product_oid);
        form.setQuantity(0, 3);
        form.advanceShare(0.5);
        expect(form.form.controls.advance_paid.value).toBe(2100);
        expect(form.balance()).toBe(2100);
        form.advanceShare(1);
        expect(form.balance()).toBe(0);
    });

    it('sets the expected date a week out in one tap', async () => {
        const { form } = await open();
        form.expectIn(7);
        const expected = new Date();
        expected.setHours(0, 0, 0, 0);
        expected.setDate(expected.getDate() + 7);
        expect(form.form.controls.expected_date.value?.getTime()).toBe(expected.getTime());
    });

    it('greys out days already past and refuses to save one, but lets an overdue booking keep its own date', async () => {
        const { form, http } = await open();
        const yesterday = new Date();
        yesterday.setHours(0, 0, 0, 0);
        yesterday.setDate(yesterday.getDate() - 1);
        expect(form.disabledDate(yesterday)).toBe(true);
        expect(form.disabledDate(new Date())).toBe(false);

        form.products.set([KURTI]);
        form.add(KURTI.product_oid);
        form.form.patchValue({ phone: '01711000111' });
        lookUp(http, 'Nusrat');
        form.form.patchValue({ expected_date: yesterday });
        expect(form.blocker()).toBe('sales.preOrder.blocker.pastDate');
        expect(form.valid()).toBe(false);
        form.expectIn(7);
        expect(form.valid()).toBe(true);
    });

    it('says in the footer what still stops Save, one thing at a time', async () => {
        const { fixture, form, http, element } = await open();
        fixture.detectChanges();
        expect(element.querySelector('[data-pre-order="blocker"]')?.textContent).toContain('sales.preOrder.blocker.phone');
        form.form.patchValue({ phone: '01711000111' });
        lookUp(http, null);
        expect(form.blocker()).toBe('sales.preOrder.blocker.name');
        form.form.patchValue({ name: 'Nusrat' });
        expect(form.blocker()).toBe('sales.preOrder.blocker.lines');
        form.products.set([KURTI]);
        form.add(KURTI.product_oid);
        fixture.detectChanges();
        expect(form.blocker()).toBeNull();
        expect(element.querySelector('[data-pre-order="blocker"]')).toBeNull();
    });

    it('fills the phone and name from a pasted chat message', async () => {
        const { form, http } = await open();
        form.pasteOpen.set(true);
        form.pasteText.set('Name: Nusrat Jahan, phone 01711000111, the blue kurti please');
        form.readPaste();
        http.expectOne((r) => r.url.includes(APIEndpoint.READ_CHAT_MESSAGE)).flush({ code: 200, data: { phone: '01711000111', name: 'Nusrat Jahan', other_phones: [], address_line: null, area: null, location: null, lookup: null } });
        lookUp(http, null);
        expect(form.form.controls.phone.value).toBe('01711000111');
        expect(form.form.controls.name.value).toBe('Nusrat Jahan');
        expect(form.pasteOpen()).toBe(false);
    });

    it('says so when a pasted message holds no phone or name, and keeps it open to fix', async () => {
        const { form, http } = await open();
        form.pasteOpen.set(true);
        form.pasteText.set('hello, is this available?');
        form.readPaste();
        http.expectOne((r) => r.url.includes(APIEndpoint.READ_CHAT_MESSAGE)).flush({ code: 200, data: { phone: null, name: null, other_phones: [], address_line: null, area: null, location: null, lookup: null } });
        expect(form.pasteResult()).toBe('nothing');
        expect(form.pasteOpen()).toBe(true);
    });

    it('warns on a line when the customer already has that product on an open booking', async () => {
        const { fixture, form, http, element } = await open();
        form.form.patchValue({ phone: '01711000111' });
        lookUp(http, 'Nusrat', [{ oid: 'b-9', preorder_no: 'PRE-2610-0009', status: 'Pending', product_oid: 'p-scarf', quantity: 2 }]);
        form.products.set([SCARF, KURTI]);
        form.add(SCARF.product_oid);
        form.add(KURTI.product_oid);
        fixture.detectChanges();
        expect(form.openBookingCount()).toBe(1);
        expect(element.querySelectorAll('[data-pre-order="already-booked"]').length).toBe(1);
        expect(element.querySelector('[data-line="p-scarf"] [data-pre-order="already-booked"]')).not.toBeNull();
    });
});
