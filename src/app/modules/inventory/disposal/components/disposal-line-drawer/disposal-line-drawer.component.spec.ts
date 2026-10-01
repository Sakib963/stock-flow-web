import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { DisposableProduct, DisposalLineDraft } from '@app/core/models/disposal.model';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { DisposalLineDrawerComponent } from './disposal-line-drawer.component';

const CREAM: DisposableProduct = {
    oid: 'p-1',
    name: 'Sun cream',
    sku: 'SUN',
    has_expiry: true,
    unit_type: 'pcs',
    photo_thumb: null,
    batches: [
        { oid: 'i-1', batch_code: 'B-7KQ4-M2XH', intended_use: 'for_sale', on_hand: 10, free: 8, cost_price: '300', selling_price: '500', maximum_discount: '50', warehouse_name: 'Main', expiry_date: '2027-03-31' },
        { oid: 'i-2', batch_code: 'B-HELD-0001', intended_use: 'for_sale', on_hand: 4, free: 0, cost_price: '300', selling_price: '500', maximum_discount: '50', warehouse_name: 'Main', expiry_date: null },
    ],
};
const POUCH: DisposableProduct = { oid: 'p-2', name: 'Delivery pouch', sku: 'POUCH', has_expiry: false, unit_type: 'pcs', photo_thumb: null, batches: [] };

const open = async (line: DisposalLineDraft | null = null) => {
    await TestBed.configureTestingModule({
        imports: [DisposalLineDrawerComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(DisposalLineDrawerComponent);
    fixture.componentRef.setInput('line', line);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const drawer = fixture.componentInstance;
    const saved: DisposalLineDraft[] = [];
    drawer.saved.subscribe((l) => saved.push(l));
    const pick = (product: DisposableProduct) => {
        drawer.results.set([product]);
        drawer.pickProduct(product.oid);
        fixture.detectChanges();
    };
    return { fixture, drawer, saved, pick };
};

describe('DisposalLineDrawerComponent', () => {
    it('offers only batches with something free, and says so when there is nothing to dispose', async () => {
        const { drawer, pick } = await open();
        pick(CREAM);
        expect(drawer.batches().map((b) => b.oid)).toEqual(['i-1']);
        pick(POUCH);
        expect(document.querySelector('[data-drawer="no-batches"]')?.textContent).toContain('inventory.disposal.drawer.noStock');
    });

    it('takes no more than the batch has free, and needs a reason', async () => {
        const { drawer, saved, pick } = await open();
        pick(CREAM);
        drawer.form.patchValue({ inventory_oid: 'i-1', quantity: 9 });
        drawer.save();
        expect(drawer.problem()).toBe('inventory.disposal.problem.moreThanFree');
        drawer.form.patchValue({ quantity: 2 });
        drawer.save();
        expect(drawer.problem()).toBe('inventory.disposal.problem.reason');
        drawer.form.patchValue({ reason: 'damaged' });
        drawer.save();
        expect(saved).toEqual([expect.objectContaining({ product_oid: 'p-1', inventory_oid: 'i-1', quantity: 2, reason: 'damaged', line_note: null })]);
    });

    it('needs a line note when the reason is Other', async () => {
        const { drawer, saved, pick } = await open();
        pick(CREAM);
        drawer.form.patchValue({ inventory_oid: 'i-1', quantity: 1, reason: 'other' });
        drawer.save();
        expect(drawer.problem()).toBe('inventory.disposal.problem.note');
        drawer.form.patchValue({ line_note: ' Left in the sun ' });
        drawer.save();
        expect(saved.at(-1)?.line_note).toBe('Left in the sun');
    });

    it('loads the product list as it opens without spinning the picker', async () => {
        const { drawer } = await open();
        expect([drawer.searching(), drawer.preloading()]).toEqual([false, true]);
    });
});
