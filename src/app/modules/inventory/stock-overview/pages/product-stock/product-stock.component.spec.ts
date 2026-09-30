import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ProductStock, StockBatch } from '@app/core/models/stock-overview.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { ProductStockComponent } from './product-stock.component';

const batch = (over: Partial<StockBatch>): StockBatch => ({
    oid: 'i-1', batch_code: 'B-7KQ4-M2XH', intended_use: 'for_sale', status: 'ready_for_sale', received_on: '2026-09-30T08:00:00.000', expiry_date: null,
    initial_quantity: 10, on_hand: 10, held: 2, sellable: 8, selling_price: 500, maximum_discount: 50, priced: true,
    warehouse_name: 'Main', aisle_name: null, purchase_oid: 'po-1', po_number: 'PO-2609-0001', supplier_name: 'Beauty house', ...over,
});

const OWNER_VIEW: ProductStock = {
    product: { oid: 'p-1', name: 'Sun cream', sku: 'SUN', photo: null, status: 'Active', unit_type: 'pcs', restock_threshold: 5, has_expiry: false, category_name: 'Skincare', sub_category_name: 'Creams', brand_name: null },
    figures: { on_hand: 10, held: 2, sellable: 8, batches: 1, unpriced_batches: 0, expired_units: 0, expiring_units: 0, stock_value: 3000, internal_value: 0, expiring_value: 0, expected_revenue: 5000, profit_full: 1800, profit_discounted: 1300 },
    batches: [batch({ cost_price: 300, budget_per_unit: 20, margin_per_unit: 180 }), batch({ oid: 'i-2', batch_code: 'B-0000-0001', intended_use: 'internal_use', status: 'internal_use', on_hand: 0, held: 0, sellable: 0, selling_price: null, maximum_discount: null, priced: false })],
    activity: [],
    sees_money: true,
    business_name: 'StockFlow',
};

const { stock_value, internal_value, expiring_value, expected_revenue, profit_full, profit_discounted, ...quantities } = OWNER_VIEW.figures;
const STAFF_VIEW: ProductStock = { ...OWNER_VIEW, figures: quantities, batches: [batch({})], sees_money: false };

const open = async (data: ProductStock, permissions: string[]) => {
    await TestBed.configureTestingModule({
        imports: [ProductStockComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'p-1']]) } } }, { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProductStockComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_PRODUCT_STOCK))
        .flush({ code: 200, data });
    fixture.detectChanges();
    return fixture;
};

const text = (el: HTMLElement) => el.textContent ?? '';

describe('ProductStockComponent', () => {
    it('shows the owner stock value, probable profit at full price and at full discount, and each batch probable revenue and profit', async () => {
        const fixture = await open(OWNER_VIEW, ['inventory.overview.view', 'inventory.overview.edit', 'inventory.stock-value.view']);
        const keys = fixture.componentInstance.figures().map((f) => f.key);
        expect(keys).toEqual(expect.arrayContaining(['stock_value', 'revenue', 'profit_full', 'profit_discounted', 'margin']));
        expect(fixture.componentInstance.figures().find((f) => f.key === 'margin')?.value).toBe(36);
        const page = text(fixture.nativeElement);
        expect(page).toContain('inventory.stockOverview.revenue');
        expect(page).toContain('inventory.stockOverview.profit');
        expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-batch-actions]').length).toBe(1);
    });

    it('draws no money for Staff, and offers only stickers', async () => {
        const fixture = await open(STAFF_VIEW, ['inventory.overview.view']);
        expect(fixture.componentInstance.figures().map((f) => f.key)).toEqual(['sellable', 'on_hand', 'held', 'expiring']);
        const page = text(fixture.nativeElement);
        expect(page).not.toContain('inventory.stockOverview.cost');
        expect(page).not.toContain('inventory.stockOverview.revenue');
        expect(page).not.toContain('inventory.stockOverview.profit');
        const component = fixture.componentInstance;
        expect(component.canPrice(STAFF_VIEW.batches[0])).toBe(false);
        expect(component.canBudget(STAFF_VIEW.batches[0])).toBe(false);
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-batch-actions]')).not.toBeNull();
    });

    it('hides a sold out batch until asked, and never offers a price for internal use stock', async () => {
        const fixture = await open(OWNER_VIEW, ['inventory.overview.view', 'inventory.overview.edit', 'inventory.stock-value.view']);
        const page = fixture.componentInstance;
        expect(page.batches().map((b) => b.oid)).toEqual(['i-1']);
        page.showSoldOut.set(true);
        expect(page.batches().map((b) => b.oid)).toEqual(['i-1', 'i-2']);
        expect(page.canPrice(OWNER_VIEW.batches[1])).toBe(false);
        expect(page.canPrice(OWNER_VIEW.batches[0])).toBe(true);
    });
});
