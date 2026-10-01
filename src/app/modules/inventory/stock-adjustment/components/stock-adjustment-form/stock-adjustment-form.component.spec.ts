import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { AdjustableProduct, AdjustmentLineDraft } from '@app/core/models/stock-adjustment.model';

import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { StockAdjustmentFormComponent } from './stock-adjustment-form.component';

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

const fromBatch = (quantity: number): AdjustmentLineDraft => ({ product: CREAM, batch: CREAM.batches[0], product_oid: 'p-1', direction: null, quantity, inventory_oid: 'i-1', cost_price: null, intended_use: null, selling_price: null, maximum_discount: null, warehouse_oid: null, aisle_oid: null, expiry_date: null, ...NO_BUDGET });

const newBatch = (quantity: number): AdjustmentLineDraft => ({ product: CREAM, batch: null, product_oid: 'p-1', direction: null, quantity, inventory_oid: null, cost_price: 300, intended_use: 'for_sale', selling_price: 500, maximum_discount: 50, warehouse_oid: 'w-1', aisle_oid: null, expiry_date: null, ...NO_BUDGET });

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [StockAdjustmentFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(StockAdjustmentFormComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .match(() => true)
        .forEach((request) => request.flush({ data: [] }));
    const form = fixture.componentInstance;
    const add = (line: AdjustmentLineDraft) => {
        form.addLine();
        form.saveLine(line);
    };
    return { fixture, form, add };
};

describe('StockAdjustmentFormComponent', () => {
    it('keeps Add product shut until a reason is chosen', async () => {
        const { fixture, form } = await open();
        const button = () => fixture.nativeElement.querySelector('[data-form="add-line"]') as HTMLButtonElement;
        expect(button().disabled).toBe(true);
        form.form.controls.reason.setValue('found');
        fixture.detectChanges();
        expect(button().disabled).toBe(false);
    });

    it('adds a line from the drawer, changes it in place, and marks the form changed', async () => {
        const { form, add } = await open();
        form.form.controls.reason.setValue('theft');
        add(fromBatch(3));
        expect(form.form.dirty).toBe(true);
        expect(form.unitsOut()).toBe(3);
        form.editLine(0);
        expect(form.drawerLine()?.quantity).toBe(3);
        form.saveLine(fromBatch(5));
        expect(form.lines().length).toBe(1);
        expect(form.unitsOut()).toBe(5);
        expect(form.drawerOpen()).toBe(false);
    });

    it('sends each line without the product and batch it carries to draw itself', async () => {
        const { form, add } = await open();
        form.form.controls.reason.setValue('theft');
        add(fromBatch(8));
        expect(form.valid()).toBe(true);
        expect(form.payload().lines).toEqual([{ product_oid: 'p-1', direction: null, quantity: 8, inventory_oid: 'i-1', cost_price: null, intended_use: null, selling_price: null, maximum_discount: null, warehouse_oid: null, aisle_oid: null, expiry_date: null, ...NO_BUDGET }]);
    });

    it('shows a line’s problem in its own row when the reason changes under it', async () => {
        const { fixture, form, add } = await open();
        form.form.controls.reason.setValue('found');
        add(newBatch(4));
        expect(form.valid()).toBe(true);
        form.form.controls.reason.setValue('theft');
        fixture.detectChanges();
        expect(form.problems()[0]).toBe('inventory.stockAdjustment.problem.batch');
        expect(form.valid()).toBe(false);
        expect(form.remaining()).toBe(1);
        expect(fixture.nativeElement.querySelector('[data-line-problem="0"]')).not.toBeNull();
    });

    it('asks an entry error line which way it goes, and sends the direction only then', async () => {
        const { form, add } = await open();
        form.form.controls.reason.setValue('entry_error');
        add(fromBatch(1));
        expect(form.problems()[0]).toBe('inventory.stockAdjustment.problem.direction');
        form.editLine(0);
        form.saveLine({ ...fromBatch(1), direction: 'out' });
        expect(form.problems()[0]).toBeNull();
        expect(form.payload().lines[0].direction).toBe('out');
        form.form.controls.reason.setValue('lost');
        expect(form.payload().lines[0].direction).toBeNull();
    });

    it('removes a line and counts what is left', async () => {
        const { form, add } = await open();
        form.form.controls.reason.setValue('found');
        add(newBatch(4));
        add(fromBatch(2));
        expect(form.unitsIn()).toBe(6);
        form.removeLine(0);
        expect(form.lines().length).toBe(1);
        expect(form.unitsIn()).toBe(2);
    });

    it('saves a draft with only its reason, but submits only with complete lines', async () => {
        const { form } = await open();
        expect(form.validDraft()).toBe(false);
        form.form.controls.reason.setValue('found');
        expect(form.validDraft()).toBe(true);
        expect(form.valid()).toBe(false);
        expect(form.remaining()).toBe(1);
    });
});
