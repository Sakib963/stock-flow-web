import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PurchasableProduct } from '@app/core/models/purchase-order.model';
import { PurchaseOrderFormComponent } from './purchase-order-form.component';

const KURTI: PurchasableProduct = { oid: 'p-1', name: 'Cotton kurti', sku: 'KURTI', restock_threshold: 20, photo_thumb: null, sellable: 4, sold_30_days: 12, last_unit_price: '450', last_supplier_name: 'Garment house', last_bought_on: null };

const open = async (): Promise<ComponentFixture<PurchaseOrderFormComponent>> => {
    await TestBed.configureTestingModule({
        imports: [PurchaseOrderFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();

    const fixture = TestBed.createComponent(PurchaseOrderFormComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN)).flush({ data: [{ value: 's-1', label: 'Garment house', phone_number: '01711-000000' }] });
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)).flush({ data: [{ value: 'w-1', label: 'Main' }] });
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN)).flush({ data: [{ value: 'a-1', label: 'Shelf A', warehouse_oid: 'w-1' }] });
    return fixture;
};

/** Picks a product in a row the way the search does: results first, then the value. */
const pick = (form: PurchaseOrderFormComponent, row: number, product: PurchasableProduct) => {
    form.results.set([product]);
    form.lines.at(row).controls.product_oid.setValue(product.oid);
};

describe('PurchaseOrderFormComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('always keeps one blank line last, carrying the warehouse and aisle down', async () => {
        const form = (await open()).componentInstance;
        expect(form.lines.length).toBe(1);

        form.lines.at(0).patchValue({ warehouse_oid: 'w-1', aisle_oid: 'a-1' });
        pick(form, 0, KURTI);

        expect(form.lines.length).toBe(2);
        expect(form.lines.at(1).getRawValue()).toEqual(expect.objectContaining({ product_oid: '', warehouse_oid: 'w-1', aisle_oid: 'a-1' }));
    });

    it('starts a line at the last price paid, and leaves the blank line out of the order', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ supplier_oid: 's-1', purchase_type: 'advance', payment_status: 'unpaid' });
        form.lines.at(0).patchValue({ warehouse_oid: 'w-1' });
        pick(form, 0, KURTI);
        form.lines.at(0).controls.quantity.setValue(80);

        const payload = form.payload();
        expect(payload.products).toEqual([{ product_oid: 'p-1', warehouse_oid: 'w-1', aisle_oid: null, quantity: 80, unit_price: 450 }]);
        expect(form.total()).toBe(36000);
        expect(form.valid()).toBe(true);
    });

    it('sends a paid amount only for a partial payment, since the server records the rest itself', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ payment_status: 'partially_paid', paid_amount: 5000 });
        expect(form.payload().paid_amount).toBe(5000);

        form.form.controls.payment_status.setValue('paid');
        expect(form.payload().paid_amount).toBe(0);
    });

    it('will not submit without a product', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ supplier_oid: 's-1', purchase_type: 'instant', payment_status: 'paid' });
        expect(form.valid()).toBe(false);
        expect(form.remaining()).toBe(1);
    });

    it('drops an aisle that is not in the warehouse the line moves to', async () => {
        const form = (await open()).componentInstance;
        form.lines.at(0).patchValue({ warehouse_oid: 'w-1', aisle_oid: 'a-1' });
        form.lines.at(0).controls.warehouse_oid.setValue('w-2');
        expect(form.lines.at(0).controls.aisle_oid.value).toBeNull();
    });

    it('leaves payment out of an edit, since only Record payment changes it', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', { details: { oid: 'po-1', supplier_oid: 's-1', purchase_type: 'advance', expected_delivery_date: null, payment_status: 'paid', paid_amount: '36000', special_notes: null }, lines: [{ product_oid: 'p-1', product_name: 'Cotton kurti', sku: 'KURTI', sellable: 4, restock_threshold: 20, warehouse_oid: 'w-1', aisle_oid: null, ordered_quantity: 80, ordered_unit_price: '450' }], stats: {}, activity: [] } as never);
        fixture.detectChanges();

        const payload = fixture.componentInstance.payload();
        expect(payload.payment_status).toBeUndefined();
        expect(payload.paid_amount).toBeUndefined();
        expect(payload.products).toHaveLength(1);
    });

    it('saves a draft with only the supplier, sending half typed lines as they are', async () => {
        const form = (await open()).componentInstance;
        expect(form.validDraft()).toBe(false);

        form.form.patchValue({ supplier_oid: 's-1' });
        pick(form, 0, KURTI);
        form.lines.at(0).controls.unit_price.setValue(null);

        expect(form.validDraft()).toBe(true);
        const payload = form.payload(true);
        expect(payload.draft).toBe(true);
        expect(payload.products).toEqual([{ product_oid: 'p-1', warehouse_oid: null, aisle_oid: null, quantity: null, unit_price: null }]);
    });
});
