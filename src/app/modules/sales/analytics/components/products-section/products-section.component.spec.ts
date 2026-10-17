import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ProductFigures } from '@app/core/models/sales-analytics.model';
import { ProductsSectionComponent } from './products-section.component';

const FIGURES: ProductFigures = {
    period: { date_from: '2026-10-01', date_to: '2026-10-31', previous_from: '2026-08-31', previous_to: '2026-09-30' },
    products: [{ oid: 'P-1', name: 'Floral Kurti', kept_units: 30, demand_units: 40, sales: 30000, profit: 9000, sold_units: 32, returned_units: 2, damaged_units: 1 }],
    together: [{ first_oid: 'P-1', first_name: 'Floral Kurti', second_oid: 'P-2', second_name: 'Tote Bag', orders: 3 }],
    return_reasons: [{ reason: 'size_or_fit', units: 2, damaged: 1 }],
    buyers: [
        { gender: 'Female', age_band: '18_24', customers: 6 },
        { gender: 'Male', age_band: '25_34', customers: 2 },
        { gender: null, age_band: null, customers: 2 },
    ],
    age_demand: [
        { age_band: '25_34', oid: 'P-2', name: 'Tote Bag', units: 2, buyers: 2 },
        { age_band: '18_24', oid: 'P-1', name: 'Floral Kurti', units: 8, buyers: 6 },
        { age_band: '18_24', oid: 'P-2', name: 'Tote Bag', units: 4, buyers: 3 },
    ],
    suppliers: [
        { oid: 'SU-1', name: 'Mill', kept_units: 25, sales: 25000, profit: 8000, sold_units: 26, returned_units: 1, damaged_units: 1, received_all_time: 50, kept_all_time: 40 },
        { oid: null, name: null, kept_units: 5, sales: 5000, profit: 1000, sold_units: 6, returned_units: 1, damaged_units: 0, received_all_time: 0, kept_all_time: 0 },
    ],
    totals: { sales: 30000, orders: 20, without_customer: 4 },
    insights: { products: { key: 'top_product', params: { product: 'Floral Kurti', share: 100 } }, demand: null, suppliers: null, buyers: null },
};

const loaded = async () => {
    await TestBed.configureTestingModule({
        imports: [ProductsSectionComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProductsSectionComponent);
    fixture.componentRef.setInput('query', { date_from: '2026-10-01', date_to: '2026-10-31' });
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_SALES_ANALYTICS_PRODUCTS))
        .flush({ code: 200, message: 'ok', data: FIGURES });
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
};

describe('ProductsSectionComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('puts women left and men right in each age band, and counts buyers with nothing recorded apart', async () => {
        const { fixture } = await loaded();
        const bands = Object.fromEntries(fixture.componentInstance.pyramid().map((r) => [r.key, [r.left, r.right]]));
        expect(bands['18_24']).toEqual([6, 0]);
        expect(bands['25_34']).toEqual([0, 2]);
        expect(fixture.componentInstance.buyerCounts()).toEqual({ total: 10, unknown: 2 });
    });

    it('lists what each age group kept most of, youngest first, and leaves out a group with no sales', async () => {
        const { fixture, element } = await loaded();
        expect(fixture.componentInstance.ageDemand().map((g) => [g.band, g.products.map((p) => [p.oid, p.width])])).toEqual([
            ['18_24', [['P-1', 100], ['P-2', 50]]],
            ['25_34', [['P-2', 100]]],
        ]);
        expect(element.querySelector('[data-age-group="18_24"]')?.textContent).toContain('Floral Kurti');
        expect(element.querySelector('[data-age-group="under_18"]')).toBeNull();
    });

    it('shows how much of what was asked for was kept, and sell-through per supplier', async () => {
        const { fixture, element } = await loaded();
        expect(fixture.componentInstance.products()[0].kept).toBe(75);
        expect(element.querySelector('[data-supplier="SU-1"]')?.textContent).toContain('80%');
        expect(element.querySelector('[data-supplier="none"]')).not.toBeNull();
    });
});
