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
        expect([form.supplierPicker.loading(), form.warehousesLoading(), form.aislesLoading()]).toEqual([true, true, true]);

        const http = TestBed.inject(HttpTestingController);
        http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN)).flush({ data: [] });
        http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)).flush({ data: [] });
        http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN)).flush('down', { status: 500, statusText: 'Server Error' });
        expect([form.supplierPicker.loading(), form.warehousesLoading(), form.aislesLoading()]).toEqual([false, false, false]);
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
        const named = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith(APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN));
        expect(named.request.params.get('oids')).toBe('s-1');
        named.flush({ data: [{ value: 's-1', label: 'Garment house', phone_number: '01711-000000', last_ordered_on: null }] });

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
    describe('the supplier picker, searched on the server', () => {
        const isSuppliers = (r: { url: string }) => r.url.endsWith(APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN);
        const supplier = (i: number) => ({ value: `s-${i}`, label: `Supplier ${i}`, phone_number: '01711-000000', last_ordered_on: null });

        afterEach(() => vi.useRealTimers());

        it('asks the server once typing pauses, showing it is searching from the first keystroke', async () => {
            vi.useFakeTimers();
            const form = (await open()).componentInstance;
            const http = TestBed.inject(HttpTestingController);

            form.supplierPicker.search('garm');
            expect(form.supplierPicker.loading()).toBe(true);
            http.expectNone(isSuppliers);
            vi.advanceTimersByTime(300);

            const asked = http.expectOne(isSuppliers);
            expect(asked.request.params.get('search')).toBe('garm');
            asked.flush({ data: [supplier(1)] });
            expect(form.supplierPicker.loading()).toBe(false);
            expect(form.supplierPicker.choices().map((s) => s.label)).toEqual(['Supplier 1']);
        });

        it('brings the next fifty when the list is scrolled to its end, and stops after a short page', async () => {
            await TestBed.configureTestingModule({
                imports: [PurchaseOrderFormComponent],
                providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' })],
            }).compileComponents();
            const form = TestBed.createComponent(PurchaseOrderFormComponent).componentInstance;
            const http = TestBed.inject(HttpTestingController);
            http.expectOne(isSuppliers).flush({ data: Array.from({ length: 50 }, (_, i) => supplier(i)) });
            http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)).flush({ data: [] });
            http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN)).flush({ data: [] });

            form.supplierPicker.more();
            const next = http.expectOne(isSuppliers);
            expect(next.request.params.get('offset')).toBe('50');
            next.flush({ data: [supplier(50)] });
            expect(form.supplierPicker.choices()).toHaveLength(51);

            form.supplierPicker.more();
            http.expectNone(isSuppliers);
        });

        it('keeps showing it is searching while an older answer lands during the pause, and lists the chosen supplier only when nothing is typed', async () => {
            vi.useFakeTimers();
            const form = (await open()).componentInstance;
            const http = TestBed.inject(HttpTestingController);
            form.form.controls.supplier_oid.setValue('s-1');

            form.supplierPicker.search('zzz');
            form.supplierPicker.retry();
            form.supplierPicker.search('zzzz');
            http.expectOne(isSuppliers).flush({ data: [supplier(1)] });
            expect(form.supplierPicker.loading()).toBe(true);

            vi.advanceTimersByTime(300);
            http.expectOne(isSuppliers).flush({ data: [] });
            expect(form.supplierPicker.loading()).toBe(false);
            expect(form.supplierPicker.choices()).toEqual([]);
        });

        it('asks for a failed next page again when the list is scrolled again', async () => {
            await TestBed.configureTestingModule({
                imports: [PurchaseOrderFormComponent],
                providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' })],
            }).compileComponents();
            const form = TestBed.createComponent(PurchaseOrderFormComponent).componentInstance;
            const http = TestBed.inject(HttpTestingController);
            http.expectOne(isSuppliers).flush({ data: Array.from({ length: 50 }, (_, i) => supplier(i)) });
            http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)).flush({ data: [] });
            http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN)).flush({ data: [] });

            form.supplierPicker.more();
            http.expectOne(isSuppliers).flush('down', { status: 500, statusText: 'Server Error' });
            expect(form.supplierPicker.choices()).toHaveLength(50);

            form.supplierPicker.more();
            expect(http.expectOne(isSuppliers).request.params.get('offset')).toBe('50');
        });

        it('says the suppliers could not load and asks again for the same words from Try again', async () => {
            vi.useFakeTimers();
            const form = (await open()).componentInstance;
            const http = TestBed.inject(HttpTestingController);
            form.supplierPicker.search('garm');
            vi.advanceTimersByTime(300);
            http.expectOne(isSuppliers).flush('down', { status: 500, statusText: 'Server Error' });
            expect(form.supplierPicker.failed()).toBe(true);

            form.supplierPicker.retry();
            const again = http.expectOne(isSuppliers);
            expect(again.request.params.get('search')).toBe('garm');
            again.flush({ data: [supplier(1)] });
            expect(form.supplierPicker.failed()).toBe(false);
        });
    });
});
