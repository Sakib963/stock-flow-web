import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { AdjustableProduct, AdjustmentLineDraft, AdjustmentReason } from '@app/core/models/stock-adjustment.model';

import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { AdjustmentLineDrawerComponent } from './adjustment-line-drawer.component';

const NO_BUDGET = { ad_run_cost: null, packaging_cost: null, gift_cost: null, content_creation_cost: null, influencer_cost: null, cost_remarks: null };

const CREAM: AdjustableProduct = {
    oid: 'p-1',
    name: 'Sun cream',
    sku: 'SUN',
    has_expiry: false,
    unit_type: 'pcs',
    photo_thumb: null,
    batches: [{ oid: 'i-1', batch_code: 'B-7KQ4-M2XH', intended_use: 'for_sale', on_hand: 10, free: 8, cost_price: '300', selling_price: '500', maximum_discount: '50', warehouse_name: 'Main', expiry_date: null }],
};
const POUCH: AdjustableProduct = { oid: 'p-2', name: 'Delivery pouch', sku: 'POUCH', has_expiry: false, unit_type: 'pcs', photo_thumb: null, batches: [] };

const open = async (reason: AdjustmentReason, line: AdjustmentLineDraft | null = null) => {
    await TestBed.configureTestingModule({
        imports: [AdjustmentLineDrawerComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdjustmentLineDrawerComponent);
    fixture.componentRef.setInput('reason', reason);
    fixture.componentRef.setInput('line', line);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const drawer = fixture.componentInstance;
    const saved: AdjustmentLineDraft[] = [];
    drawer.saved.subscribe((line) => saved.push(line));
    const pick = (product: AdjustableProduct) => {
        drawer.results.set([product]);
        drawer.pickProduct(product.oid);
        fixture.detectChanges();
    };
    const flush = () =>
        TestBed.inject(HttpTestingController)
            .match(() => true)
            .forEach((request) => request.flush({ data: [] }));
    return { fixture, drawer, saved, pick, flush };
};

describe('AdjustmentLineDrawerComponent', () => {
    it('says so when a product has no batches to take a theft from', async () => {
        const { drawer, pick } = await open('theft');
        pick(POUCH);
        expect(drawer.batches()).toEqual([]);
        expect(document.querySelector('[data-drawer="no-batches"]')?.textContent).toContain('inventory.stockAdjustment.drawer.noStock');
    });

    it('says a found product with no batches goes into a new batch, and asks for its details', async () => {
        const { drawer, pick } = await open('found');
        pick(POUCH);
        expect(drawer.newBatch()).toBe(true);
        expect(document.querySelector('[data-drawer="no-batches"]')?.textContent).toContain('inventory.stockAdjustment.drawer.onlyNewBatch');
    });

    it('takes no more out of a batch than it has free', async () => {
        const { fixture, drawer, saved, pick } = await open('theft');
        pick(CREAM);
        drawer.form.patchValue({ inventory_oid: 'i-1', quantity: 9 });
        drawer.save();
        fixture.detectChanges();
        expect(saved).toEqual([]);
        expect(drawer.problem()).toBe('inventory.stockAdjustment.problem.moreThanFree');
        drawer.form.patchValue({ quantity: 8 });
        drawer.save();
        expect(saved).toEqual([expect.objectContaining({ product_oid: 'p-1', inventory_oid: 'i-1', quantity: 8, cost_price: null, warehouse_oid: null, batch: CREAM.batches[0] })]);
    });

    it('starts a new batch at the newest batch’s cost and price, and needs a warehouse', async () => {
        const { drawer, saved, pick } = await open('opening_stock');
        pick(CREAM);
        drawer.form.patchValue({ quantity: 10 });
        expect(drawer.form.controls.cost_price.value).toBe(300);
        expect(drawer.form.controls.selling_price.value).toBe(500);
        drawer.save();
        expect(drawer.problem()).toBe('inventory.stockAdjustment.problem.warehouse');
        drawer.form.patchValue({ warehouse_oid: 'w-1' });
        drawer.save();
        expect(saved).toEqual([expect.objectContaining({ inventory_oid: null, cost_price: 300, selling_price: 500, warehouse_oid: 'w-1', batch: null })]);
    });

    it('loads the product list as it opens without spinning the picker, which spins only for a typed search', async () => {
        const { drawer } = await open('found');
        expect([drawer.searching(), drawer.preloading()]).toEqual([false, true]);
        drawer.search('cream');
        expect(drawer.searching()).toBe(true);
    });

    it('keeps budgets only on a line that makes a new batch', async () => {
        const { drawer, saved, pick } = await open('found');
        pick(CREAM);
        drawer.form.patchValue({ quantity: 2, warehouse_oid: 'w-1', ad_run_cost: 30, cost_remarks: ' Eid stock ' });
        drawer.save();
        expect(saved.at(-1)).toEqual(expect.objectContaining({ inventory_oid: null, ad_run_cost: 30, packaging_cost: null, cost_remarks: 'Eid stock' }));
        drawer.form.patchValue({ inventory_oid: 'i-1' });
        drawer.save();
        expect(saved.at(-1)).toEqual(expect.objectContaining({ inventory_oid: 'i-1', ad_run_cost: null, cost_remarks: null }));
    });

    it('clears the aisle when the warehouse changes to one it is not in', async () => {
        const { fixture, drawer, pick } = await open('found');
        fixture.componentRef.setInput('aisles', [
            { value: 'a-1', label: 'Shelf A', warehouse_oid: 'w-1' },
            { value: 'a-2', label: 'Shelf B', warehouse_oid: 'w-2' },
        ]);
        pick(POUCH);
        drawer.form.patchValue({ warehouse_oid: 'w-1' });
        drawer.form.patchValue({ aisle_oid: 'a-1' });
        drawer.form.controls.warehouse_oid.setValue('w-2');
        expect(drawer.form.controls.aisle_oid.value).toBeNull();
    });

    it('fetches an edited line’s other batches without putting the product picker into loading', async () => {
        const line: AdjustmentLineDraft = { product: { ...CREAM, batches: [CREAM.batches[0]] }, batch: CREAM.batches[0], product_oid: 'p-1', direction: null, quantity: 2, inventory_oid: 'i-1', cost_price: null, intended_use: null, selling_price: null, maximum_discount: null, warehouse_oid: null, aisle_oid: null, expiry_date: null, ...NO_BUDGET };
        const second = { ...CREAM.batches[0], oid: 'i-2', batch_code: 'B-2' };
        const { drawer } = await open('found', line);
        const http = TestBed.inject(HttpTestingController);
        http.match((request) => request.urlWithParams.includes('SUN')).forEach((request) => request.flush({ data: [{ ...CREAM, batches: [CREAM.batches[0], second] }] }));
        expect(drawer.product()?.batches.map((b) => b.oid)).toEqual(['i-1', 'i-2']);
        expect(drawer.results()).toEqual([]);
    });

    it('lets go of a kept line’s batch when the reason is now opening stock', async () => {
        const line: AdjustmentLineDraft = { product: CREAM, batch: CREAM.batches[0], product_oid: 'p-1', direction: null, quantity: 2, inventory_oid: 'i-1', cost_price: null, intended_use: null, selling_price: null, maximum_discount: null, warehouse_oid: null, aisle_oid: null, expiry_date: null, ...NO_BUDGET };
        const { drawer, flush } = await open('opening_stock', line);
        flush();
        expect(drawer.form.controls.inventory_oid.value).toBe('');
        expect(drawer.newBatch()).toBe(true);
    });
});
