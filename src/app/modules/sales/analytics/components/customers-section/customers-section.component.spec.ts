import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CustomerFigures } from '@app/core/models/sales-analytics.model';
import { SessionService } from '@app/core/services/session/session.service';
import { CustomersSectionComponent } from './customers-section.component';

const FIGURES: CustomerFigures = {
    period: { date_from: '2026-10-01', date_to: '2026-10-31', previous_from: '2026-08-31', previous_to: '2026-09-30' },
    channels: ['POS', 'ONLINE'],
    places: [
        { oid: 'BD-Dhaka', name_en: 'Dhaka', name_bn: 'ঢাকা', division_oid: 'D', customers: 30, orders: 40, sales: 40000, dispatched: 25, failed: 5 },
        { oid: 'BD-Sylhet', name_en: 'Sylhet', name_bn: 'সিলেট', division_oid: 'S', customers: 4, orders: 4, sales: 3000, dispatched: 4, failed: 1 },
    ],
    repeat: { customers: 34, new_customers: 20, bought_twice: 6, days_to_second: 21 },
    cohorts: [{ cohort: '2026-08', customers: 10, returned: [{ month: 2, customers: 3 }] }],
    win_back: [{ oid: 'CU-1', name: 'Person A', sales: 3, last_bought: '2026-07-01', days_since: 122 }],
    ages: [
        { age_band: '25_34', customers: 3 },
        { age_band: '18_24', customers: 1 },
        { age_band: null, customers: 6 },
    ],
    insights: { places: null, repeat: null },
};

const loaded = async () => {
    await TestBed.configureTestingModule({
        imports: [CustomersSectionComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: SessionService, useValue: { can: () => true } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CustomersSectionComponent);
    fixture.componentRef.setInput('query', { date_from: '2026-10-01', date_to: '2026-10-31' });
    fixture.detectChanges();
    await fixture.whenStable();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_SALES_ANALYTICS_CUSTOMERS)).flush({ code: 200, message: 'ok', data: FIGURES });
    fixture.detectChanges();
    http.match(() => true).forEach((r) => r.flush({ width: 1, height: 1, credit: '', districts: [] }));
    return { fixture, element: fixture.nativeElement as HTMLElement };
};

describe('CustomersSectionComponent', () => {
    it('rates a district only over 20 parcels and counts it below that', async () => {
        const { fixture } = await loaded();
        fixture.componentInstance.pickMetric('failed');
        const values = Object.fromEntries(fixture.componentInstance.mapValues().map((v) => [v.oid, v.shown]));
        expect(values).toEqual({ 'BD-Dhaka': '20%', 'BD-Sylhet': '1 / 4' });
    });

    it('shares customers out by age group among those with an age recorded, and counts the rest apart', async () => {
        const { fixture } = await loaded();
        const ages = fixture.componentInstance.ages();
        expect([ages.known, ages.unknown]).toEqual([4, 6]);
        expect(ages.bands.map((b) => [b.band, b.customers, b.share])).toEqual([
            ['under_18', 0, 0],
            ['18_24', 1, 25],
            ['25_34', 3, 75],
            ['35_44', 0, 0],
            ['45_plus', 0, 0],
        ]);
    });

    it('turns each cohort month into the share who came back', async () => {
        const { fixture } = await loaded();
        const [row] = fixture.componentInstance.cohorts();
        expect(row.cells.map((c) => c.share)).toEqual([0, 30, 0, 0, 0]);
    });

    it('opens a customer to win back from the list', async () => {
        const { element } = await loaded();
        expect(element.querySelector('[data-win-back="CU-1"] a')?.getAttribute('href')).toBe('/app/sales/customers/CU-1');
    });

});
