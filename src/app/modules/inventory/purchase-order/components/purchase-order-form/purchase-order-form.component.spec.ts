import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PurchaseLineDraft } from '@app/core/models/purchase-order.model';
import { PurchaseOrderFormComponent } from './purchase-order-form.component';

const KURTI = { oid: 'p-1', name: 'Cotton kurti', sku: 'KURTI', restock_threshold: 20, sellable: 4, sold_30_days: 12, last_unit_price: '450', last_supplier_name: 'Garment house' };
const line = (extra: Partial<PurchaseLineDraft> = {}): PurchaseLineDraft => ({ product: KURTI, warehouse_oid: 'w-1', aisle_oid: null, quantity: 80, unit_price: 450, ...extra });

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

describe('PurchaseOrderFormComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('shows each picker loading until its choices arrive', async () => {
        await TestBed.configureTestingModule({
            imports: [PurchaseOrderFormComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();
        const fixture = TestBed.createComponent(PurchaseOrderFormComponent);
        fixture.detectChanges();
        const form = fixture.componentInstance;
        expect([form.suppliersLoading(), form.warehousesLoading(), form.aislesLoading()]).toEqual([true, true, true]);

        const http = TestBed.inject(HttpTestingController);
        http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN)).flush({ data: [] });
        http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)).flush({ data: [] });
        http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN)).flush('down', { status: 500, statusText: 'Server Error' });
        expect([form.suppliersLoading(), form.warehousesLoading(), form.aislesLoading()]).toEqual([false, false, false]);
        expect(form.choicesFailed()).toBe(true);
    });

    it('adds and changes lines from the drawer, and starts the next line where the last one went', async () => {
        const form = (await open()).componentInstance;
        form.addLine();
        expect([form.drawerOpen(), form.drawerLine()]).toEqual([true, null]);
        form.saveLine(line({ aisle_oid: 'a-1' }));

        expect(form.drawerOpen()).toBe(false);
        expect(form.carry()).toEqual({ warehouse_oid: 'w-1', aisle_oid: 'a-1' });
        expect(form.form.dirty).toBe(true);

        form.editLine(0);
        expect(form.drawerLine()?.quantity).toBe(80);
        form.saveLine(line({ quantity: 10 }));
        expect(form.lines().map((l) => l.quantity)).toEqual([10]);
    });

    it('sends every line with its total, and submits once the header and lines are complete', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ supplier_oid: 's-1', purchase_type: 'advance', payment_status: 'unpaid' });
        form.saveLine(line());

        expect(form.payload().products).toEqual([{ product_oid: 'p-1', warehouse_oid: 'w-1', aisle_oid: null, quantity: 80, unit_price: 450 }]);
        expect(form.total()).toBe(36000);
        expect(form.valid()).toBe(true);
    });

    it('holds Submit for a line kept from a draft that is still missing something, and marks the row', async () => {
        const fixture = await open();
        const form = fixture.componentInstance;
        form.form.patchValue({ supplier_oid: 's-1', purchase_type: 'advance', payment_status: 'unpaid' });
        form.lines.set([line({ unit_price: null })]);
        fixture.detectChanges();

        expect(form.valid()).toBe(false);
        expect(form.remaining()).toBe(1);
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-line-problem="0"]')).not.toBeNull();
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
        form.lines.set([line({ warehouse_oid: null, quantity: null, unit_price: null })]);

        expect(form.validDraft()).toBe(true);
        const payload = form.payload(true);
        expect(payload.draft).toBe(true);
        expect(payload.products).toEqual([{ product_oid: 'p-1', warehouse_oid: null, aisle_oid: null, quantity: null, unit_price: null }]);
    });
});
