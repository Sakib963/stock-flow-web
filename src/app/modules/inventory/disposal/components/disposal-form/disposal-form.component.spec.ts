import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { DisposableProduct, DisposalLineDraft } from '@app/core/models/disposal.model';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { DisposalFormComponent } from './disposal-form.component';

const CREAM: DisposableProduct = {
    oid: 'p-1',
    name: 'Sun cream',
    sku: 'SUN',
    has_expiry: false,
    unit_type: 'pcs',
    photo_thumb: null,
    batches: [{ oid: 'i-1', batch_code: 'B-7KQ4-M2XH', intended_use: 'for_sale', on_hand: 10, free: 8, cost_price: '300', selling_price: '500', maximum_discount: '50', warehouse_name: 'Main', expiry_date: null }],
};

const line = (quantity: number, reason: DisposalLineDraft['reason'] = 'damaged'): DisposalLineDraft => ({ product: CREAM, batch: CREAM.batches[0], product_oid: 'p-1', inventory_oid: 'i-1', quantity, reason, line_note: null });

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [DisposalFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(DisposalFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance;
    const add = (l: DisposalLineDraft) => {
        form.addLine();
        form.saveLine(l);
    };
    return { fixture, form, add };
};

describe('DisposalFormComponent', () => {
    it('adds lines from the drawer, each with its own reason, counts the units and values them at cost', async () => {
        const { form, add } = await open();
        add(line(2));
        add(line(1, 'sample'));
        expect(form.form.dirty).toBe(true);
        expect(form.units()).toBe(3);
        expect(form.valueOf(form.lines()[0])).toBe(600);
        expect(form.payload().lines).toEqual([
            { product_oid: 'p-1', inventory_oid: 'i-1', quantity: 2, reason: 'damaged', line_note: null },
            { product_oid: 'p-1', inventory_oid: 'i-1', quantity: 1, reason: 'sample', line_note: null },
        ]);
    });

    it('changes a line in place and removes one', async () => {
        const { form, add } = await open();
        add(line(2));
        form.editLine(0);
        form.saveLine(line(5));
        expect(form.units()).toBe(5);
        form.removeLine(0);
        expect(form.lines()).toEqual([]);
    });

    it('saves a draft with nothing, but submits only with complete lines', async () => {
        const { form, add } = await open();
        expect(form.validDraft()).toBe(true);
        expect(form.valid()).toBe(false);
        expect(form.remaining()).toBe(1);
        add(line(9));
        expect(form.problems()[0]).toBe('inventory.disposal.problem.moreThanFree');
        expect(form.valid()).toBe(false);
    });
});
