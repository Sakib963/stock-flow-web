import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PreOrderDetails } from '@app/core/models/pre-order.model';
import { PreOrderFormComponent } from './pre-order-form.component';

const KURTI = { product_oid: 'p-kurti', product_name: 'Block print kurti', sku: 'KURTI-1', sellable: 0, price: 1500 };

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

const lookUp = (http: HttpTestingController, name: string | null) => http.expectOne((r) => r.url.includes(APIEndpoint.FIND_CUSTOMER_BY_PHONE)).flush({ code: 200, data: { phone: '01711000111', customer: name ? { oid: 'c-1', name } : null } });

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
            lines: [{ oid: 'l-1', product_oid: 'p-kurti', product_name: 'Block print kurti', sku: 'KURTI-1', quantity: 2, unit_price: 1500, total: 3000, sellable: 0 }],
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
});
