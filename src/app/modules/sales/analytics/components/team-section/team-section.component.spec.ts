import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { TeamFigures } from '@app/core/models/sales-analytics.model';
import { TeamSectionComponent } from './team-section.component';

const person = { name: null, sales: 0, sold_orders: 0, list_price: 0, discount: 0, at_limit: 0, taken: 0, cancelled: 0, business_cancelled: 0, dispatched: 0, failed: 0, confirmed: 0 };

const TEAM: TeamFigures = {
    period: { date_from: '2026-10-01', date_to: '2026-10-31', previous_from: '2026-08-31', previous_to: '2026-09-30' },
    channels: ['POS', 'ONLINE'],
    arrivals: [
        { channel: 'POS', weekday: 0, hour: 12, orders: 5 },
        { channel: 'ONLINE', weekday: 1, hour: 21, orders: 9 },
    ],
    discount: { list_price: 10000, discount: 500, lines: 10, discounted_lines: 4, at_limit: 1 },
    discount_by_product: [{ oid: 'P-1', name: 'Floral Kurti', list_price: 5000, discount: 500, lines: 4, discounted_lines: 4, at_limit: 1 }],
    people: [
        { ...person, email: 'counter@arithmalabs.test', name: 'Person A', sales: 8000, list_price: 9000, discount: 500 },
        { ...person, email: 'moderator@arithmalabs.test', taken: 30, cancelled: 3, business_cancelled: 0, dispatched: 25, failed: 5 },
    ],
    insights: { discount: { key: 'discount_share', params: { share: 5, atLimit: 1, discounted: 4 } }, people: null },
};

const loaded = async (data: TeamFigures = TEAM) => {
    await TestBed.configureTestingModule({
        imports: [TeamSectionComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(TeamSectionComponent);
    fixture.componentRef.setInput('query', { date_from: '2026-10-01', date_to: '2026-10-31' });
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_SALES_ANALYTICS_TEAM))
        .flush({ code: 200, message: 'ok', data });
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
};

describe('TeamSectionComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('puts Sunday last in the week and names the busiest hour', async () => {
        const { fixture } = await loaded();
        const component = fixture.componentInstance;
        expect(component.cells().map((c) => [c.day, c.hour, c.count]).sort()).toEqual([
            [1, 21, 9],
            [7, 12, 5],
        ]);
        expect(component.busiest()?.params['count']).toBe('9');
    });

    it('narrows the heatmap to one channel', async () => {
        const { fixture } = await loaded();
        fixture.componentInstance.pickChannel('POS');
        expect(fixture.componentInstance.cells().map((c) => c.count)).toEqual([5]);
    });

    it('shows each person, with the online columns only when someone sells online', async () => {
        const { fixture, element } = await loaded();
        expect(element.querySelectorAll('[data-person]').length).toBe(2);
        expect(element.querySelector('[data-person="moderator@arithmalabs.test"]')?.textContent).toContain('20%');
        expect(fixture.componentInstance.showsOnline()).toBe(true);
    });

    it('hides the channel switch and the online columns for a counter-only business', async () => {
        const { fixture } = await loaded({ ...TEAM, channels: ['POS'], arrivals: [TEAM.arrivals[0]] });
        expect(fixture.componentInstance.arrivalChoices()).toEqual([]);
        expect(fixture.componentInstance.showsOnline()).toBe(false);
    });
});
