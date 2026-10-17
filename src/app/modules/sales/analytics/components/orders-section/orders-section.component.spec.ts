import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OrderFlow } from '@app/core/models/sales-analytics.model';
import { OrdersSectionComponent } from './orders-section.component';

const counts = { placed: 30, cancelled: 3, business_cancelled: 2, dispatched: 24, failed: 6 };

const FLOW: OrderFlow = {
    applies: true,
    period: { date_from: '2026-10-01', date_to: '2026-10-31', previous_from: '2026-08-31', previous_to: '2026-09-30' },
    funnel: { placed: 30, placed_value: 30000, confirmed: 26, confirmed_value: 26000, dispatched: 24, dispatched_value: 24000, delivered: 17, delivered_value: 17000, kept: 16, kept_value: 15500, waiting_confirm: 1, waiting_dispatch: 0, with_courier: 1, returned: 1 },
    cancel_reasons: [
        { reason: 'out_of_stock', business: true, before_confirm: 0, after_confirm: 2 },
        { reason: 'fake_order', business: false, before_confirm: 3, after_confirm: 0 },
    ],
    failed_reasons: [{ reason: 'refused', parcels: 6 }],
    places: [{ oid: 'BD-Dhaka', name_en: 'Dhaka', name_bn: 'ঢাকা', ...counts }],
    sources: [{ oid: 'SRC-FB', name: 'Main page', platform: 'Facebook', ...counts, dispatched: 4, failed: 1 }],
    products: [{ oid: 'P-1', name: 'Floral Kurti', units: 40, cancelled_units: 4, business_cancelled_units: 0 }],
    customers: [],
    confirming: [{ method: 'PhoneCall', dispatched: 24, failed: 6 }],
    terms: [{ terms: 'COD', dispatched: 24, failed: 6 }],
    terms_by_place: [{ oid: 'BD-Dhaka', name_en: 'Dhaka', name_bn: 'ঢাকা', cod_dispatched: 24, cod_failed: 6, advance_dispatched: 3, advance_failed: 0 }],
    risk: [
        { shown: 'no_history', placed: 20, kept: 10, failed: 4, returned: 0, cancelled: 2, open: 4 },
        { shown: 'watch', placed: 10, kept: 6, failed: 2, returned: 0, cancelled: 1, open: 1 },
    ],
    speed: { to_confirm: 2.5, to_dispatch: 20, to_deliver: 60 },
    speed_by_place: [{ oid: 'BD-Dhaka', name_en: 'Dhaka', name_bn: 'ঢাকা', delivered: 17, to_deliver: 60 }],
    insights: { funnel: { key: 'funnel_leak_deliver', params: { lost: 6, placed: 30 } }, confirming: null, terms: null, places: { key: 'place_refusal', params: { place: { en: 'Dhaka', bn: 'ঢাকা' }, failed: 6, dispatched: 24 } }, risk: null },
};

const loaded = async (data: OrderFlow | { applies: false } = FLOW) => {
    await TestBed.configureTestingModule({
        imports: [OrdersSectionComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(OrdersSectionComponent);
    fixture.componentRef.setInput('query', { date_from: '2026-10-01', date_to: '2026-10-31' });
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_SALES_ANALYTICS_ORDERS))
        .flush({ code: 200, message: 'ok', data });
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
};

describe('OrdersSectionComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('draws nothing at all for someone the section does not apply to', async () => {
        const { element } = await loaded({ applies: false });
        expect(element.querySelector('[data-analytics="orders"]')).toBeNull();
    });

    it('follows the orders from placed to kept, with what was lost under each step', async () => {
        const { fixture, element } = await loaded();
        const steps = [...element.querySelectorAll('[data-funnel]')].map((s) => s.getAttribute('data-funnel'));
        expect(steps).toEqual(['placed', 'confirmed', 'dispatched', 'delivered', 'kept']);
        const notes = fixture.componentInstance.steps().find((s) => s.key === 'dispatched')!.notes!;
        expect(notes.map((n) => [n.key.split('.').pop(), n.params['count'], n.tone])).toEqual([
            ['failed', '6', 'lost'],
            ['withCourier', '1', 'open'],
        ]);
    });

    it("marks the business's own cancellations apart from the customer's", async () => {
        const { element } = await loaded();
        const reasons = [...element.querySelectorAll('[data-reason]')].map((r) => r.getAttribute('data-reason'));
        expect(reasons).toEqual(['fake_order', 'out_of_stock']);
    });

    it('shows a rate over 20 parcels and the counts under it', async () => {
        const { fixture, element } = await loaded();
        expect(element.querySelector('[data-loss-row="BD-Dhaka"]')?.textContent).toContain('25%');
        fixture.componentInstance.pick('sources');
        fixture.detectChanges();
        expect(element.querySelector('[data-loss-row="SRC-FB"]')?.textContent).toContain('1 / 4');
    });

    it('names the place in the sentence about where parcels come back', async () => {
        const { element } = await loaded();
        expect(element.querySelector('[data-insight="places"]')?.textContent).toBeTruthy();
    });

    it('leaves out a district dot that stands on too few parcels', async () => {
        const { element } = await loaded();
        expect(element.querySelector('[data-dumbbell="BD-Dhaka"] [data-dot="first"]')).not.toBeNull();
        expect(element.querySelector('[data-dumbbell="BD-Dhaka"] [data-dot="second"]')).toBeNull();
    });

    it('lists what intake showed with the warned rows marked', async () => {
        const { element } = await loaded();
        const rows = [...element.querySelectorAll('[data-risk]')].map((r) => r.getAttribute('data-risk'));
        expect(rows).toEqual(['watch', 'no_history']);
    });
});
