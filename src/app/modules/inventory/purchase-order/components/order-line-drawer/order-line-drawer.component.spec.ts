import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { PurchasableProduct, PurchaseLineDraft } from '@app/core/models/purchase-order.model';
import { OrderLineDrawerComponent } from './order-line-drawer.component';

const KURTI: PurchasableProduct = { oid: 'p-1', name: 'Cotton kurti', sku: 'KURTI', restock_threshold: 20, photo_thumb: null, sellable: 4, sold_30_days: 12, last_unit_price: '450', last_supplier_name: 'Garment house', last_bought_on: null };

const open = async (inputs: Record<string, unknown> = {}): Promise<ComponentFixture<OrderLineDrawerComponent>> => {
    await TestBed.configureTestingModule({
        imports: [OrderLineDrawerComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(OrderLineDrawerComponent);
    fixture.componentRef.setInput('aisles', [
        { value: 'a-1', label: 'Shelf A', warehouse_oid: 'w-1' },
        { value: 'a-2', label: 'Shelf B', warehouse_oid: 'w-2' },
    ]);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
};

describe('OrderLineDrawerComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).match(() => true));

    it('shows the product search loading from the first keystroke, not after the pause', async () => {
        const drawer = (await open()).componentInstance;
        drawer.search('kur');
        expect(drawer.searching()).toBe(true);
    });

    it('starts a new line where the last one went, at the last price paid for the product', async () => {
        const fixture = await open({ carry: { warehouse_oid: 'w-1', aisle_oid: 'a-1' } });
        const drawer = fixture.componentInstance;
        let saved: PurchaseLineDraft | null = null;
        drawer.saved.subscribe((line) => (saved = line));

        drawer.results.set([KURTI]);
        drawer.pickProduct('p-1');
        drawer.form.controls.quantity.setValue(40);
        drawer.save();

        expect(saved).toEqual(expect.objectContaining({ warehouse_oid: 'w-1', aisle_oid: 'a-1', quantity: 40, unit_price: 450 }));
        expect(saved!.product.oid).toBe('p-1');
    });

    it('will not add a line missing its quantity, and says what is missing', async () => {
        const fixture = await open({ carry: { warehouse_oid: 'w-1', aisle_oid: null } });
        const drawer = fixture.componentInstance;
        const saved = vi.fn();
        drawer.saved.subscribe(saved);

        drawer.results.set([KURTI]);
        drawer.pickProduct('p-1');
        drawer.save();

        expect(saved).not.toHaveBeenCalled();
        expect(drawer.incomplete()).toBe(true);
    });

    it('drops an aisle that is not in the warehouse the line moves to', async () => {
        const drawer = (await open({ carry: { warehouse_oid: 'w-1', aisle_oid: 'a-1' } })).componentInstance;
        drawer.form.controls.warehouse_oid.setValue('w-2');
        expect(drawer.form.controls.aisle_oid.value).toBeNull();
    });

    it('opens a line to change with what it holds, keeping its own price', async () => {
        const line: PurchaseLineDraft = { product: { ...KURTI, sold_30_days: null }, warehouse_oid: 'w-2', aisle_oid: 'a-2', quantity: 5, unit_price: 500 };
        const drawer = (await open({ line })).componentInstance;
        expect(drawer.product()?.oid).toBe('p-1');
        expect(drawer.form.getRawValue()).toEqual({ warehouse_oid: 'w-2', aisle_oid: 'a-2', quantity: 5, unit_price: 500 });
        expect(drawer.lineTotal()).toBe(2500);
    });
});
