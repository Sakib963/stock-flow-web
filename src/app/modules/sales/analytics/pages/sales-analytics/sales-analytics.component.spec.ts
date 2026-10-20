import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SalesOverview } from '@app/core/models/sales-analytics.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { WaterfallChartComponent } from '@app/shared/components/charts/waterfall-chart/waterfall-chart.component';
import { SalesAnalyticsComponent } from './sales-analytics.component';

const DATA: SalesOverview = {
    period: { date_from: '2026-10-01', date_to: '2026-10-31', previous_from: '2026-08-31', previous_to: '2026-09-30' },
    channels: ['POS', 'ONLINE'],
    sources: [{ oid: 'SRC-FB', name: 'Main page', platform: 'Facebook' }],
    tiles: {
        sales: { current: 12000, previous: 10000 },
        profit: { current: 3000, previous: 3000 },
        orders: { current: 12, previous: 10 },
        margin: { current: 0.25, previous: 0.3 },
        refusal: { current: { dispatched: 4, failed: 1 }, previous: { dispatched: 0, failed: 0 } },
    },
    daily: [
        { day: '2026-10-02', sales: 5000, profit: 1000 },
        { day: '2026-10-05', sales: 7000, profit: 2000 },
    ],
    by_channel: [
        { channel: 'ONLINE', sales: 3000, profit: 900, orders: 3 },
        { channel: 'POS', sales: 9000, profit: 2100, orders: 9 },
    ],
    pre_orders: { booked: 4, booked_value: 4000, converted: 2, cancelled: 1, open: 1, open_now: 3, advance_held: 900 },
    counter: { sales: 10, units: 15, value: 9000, without_customer: 6 },
    waterfall: { list_price: 15000, discounts: 1000, returns: 2000, cost: 9000, profit: 3000, units_without_cost: 0 },
    insights: { headline: { key: 'sales_up', params: { change: 20 } }, waterfall: { key: 'of_every_hundred', params: { profit: 20, discounts: 7, returns: 13 } } },
};

const loaded = async (data: SalesOverview = DATA) => {
    await TestBed.configureTestingModule({
        imports: [SalesAnalyticsComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { can: () => true, menu: () => [] } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SalesAnalyticsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne((r) => r.url.includes(APIEndpoint.GET_SALES_ANALYTICS_OVERVIEW));
    request.flush({ code: 200, message: 'ok', data });
    fixture.detectChanges();
    await fixture.whenStable();
    // The online section asks for its own figures only once the overview says the person sells online.
    const online = http.match((r) => r.url.includes(APIEndpoint.GET_SALES_ANALYTICS_ORDERS));
    online.forEach((r) => r.flush({ code: 200, message: 'ok', data: { applies: false } }));
    fixture.detectChanges();
    return { request, online, fixture, element: fixture.nativeElement as HTMLElement };
};

describe('SalesAnalyticsComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('asks only the open tab for its figures', async () => {
        const { online } = await loaded();
        expect(online.length).toBe(0);
        expect(TestBed.inject(HttpTestingController).match((r) => r.url.includes(APIEndpoint.GET_SALES_ANALYTICS_TEAM)).length).toBe(0);
    });

    it('asks for this month so far when it opens', async () => {
        const { request } = await loaded();
        expect(request.request.params.get('date_from')?.endsWith('-01')).toBe(true);
        expect(request.request.params.get('date_to')).toBeTruthy();
    });

    it('shows the refusal tile and the online section only to someone who sells online', async () => {
        const { element, online } = await loaded({ ...DATA, channels: ['POS'], sources: [], tiles: { ...DATA.tiles, refusal: null } });
        expect(online.length).toBe(0);
        const tiles = [...element.querySelectorAll('[data-tile]')].map((t) => t.getAttribute('data-tile'));
        expect(tiles).toEqual(['sales', 'profit', 'margin', 'orders']);
    });

    it('marks a rise in sales as good news and a fall in margin as bad', async () => {
        const { element } = await loaded();
        expect(element.querySelector('[data-tile="sales"] [data-change]')?.getAttribute('data-change')).toBe('good');
        expect(element.querySelector('[data-tile="margin"] [data-change]')?.getAttribute('data-change')).toBe('bad');
    });

    it('shows a few parcels as counts, not a rate', async () => {
        const { element } = await loaded();
        expect(element.querySelector('[data-tile="refusal"]')?.textContent).not.toContain('%');
    });

    it('draws the profit waterfall from list price to profit', async () => {
        const { fixture } = await loaded();
        const chart = fixture.debugElement.query(By.directive(WaterfallChartComponent)).componentInstance as WaterfallChartComponent;
        expect(chart.bars().map((bar) => bar.key)).toEqual(['list', 'discounts', 'returns', 'cost', 'profit']);
    });

    it('says there is not enough data when nothing sold', async () => {
        const { element } = await loaded({ ...DATA, waterfall: { ...DATA.waterfall, list_price: 0 }, insights: { headline: { key: 'no_sales', params: {} }, waterfall: null } });
        expect(element.querySelector('waterfall-chart')).toBeNull();
    });

    it('shows pre-orders and the counter with converted of those decided and sales with no customer', async () => {
        const { element } = await loaded();
        expect(element.querySelector('[data-analytics="pre-orders"]')?.textContent).toContain('67%');
        expect(element.querySelector('[data-analytics="counter"]')?.textContent).toContain('60%');
    });

    it('splits sales between the counter and online by their share', async () => {
        const { element } = await loaded();
        expect(element.querySelector('[data-channel="POS"]')?.textContent).toContain('75%');
        expect(element.querySelector('[data-channel="ONLINE"]')?.textContent).toContain('25%');
    });
});
