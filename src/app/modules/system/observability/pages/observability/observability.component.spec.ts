import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { addDays, businessToday } from '@app/shared/utils/business-time/business-time';
import { ObservabilityComponent } from './observability.component';

const USAGE = {
    last_active: { occurred_on: '2026-10-20T10:00:00Z', method: 'GET', route: '/api/v1/sales/order/get-order-list', name: 'Rafi', email: 'rafi@shop.test' },
    daily: [{ day: '2026-10-19', requests: 40, people: 2 }],
    month_days: [{ day: 19, requests: 40 }],
    people: [{ oid: 'l-1', name: 'Rafi', email: 'rafi@shop.test', requests: 40, last_seen: '2026-10-20T10:00:00Z' }],
};

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [ObservabilityComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    vi.spyOn(TestBed.inject(SessionService), 'can').mockReturnValue(true);
    const fixture = TestBed.createComponent(ObservabilityComponent);
    fixture.detectChanges();
    return { fixture, http: TestBed.inject(HttpTestingController), host: fixture.nativeElement as HTMLElement };
};

// The shared list store debounces its load and holds its loader a moment, so the test waits that out.
const settle = async (fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    fixture.detectChanges();
    await fixture.whenStable();
};

describe('ObservabilityComponent', () => {
    it('shows usage for the last seven days on the business clock', async () => {
        const { fixture, http, host } = await open();
        const request = http.expectOne((r) => r.url.endsWith('/get-observability-usage'));
        expect(request.request.params.get('date_from')).toBe(addDays(businessToday(), -6));
        expect(request.request.params.get('date_to')).toBe(businessToday());
        request.flush({ data: USAGE });
        fixture.detectChanges();
        expect(host.querySelector('[data-usage="requests"]')?.textContent).toContain('40');
        expect(host.querySelector('[data-person="l-1"]')).not.toBeNull();
    });

    it("opens a route's requests already filtered to that route", async () => {
        const { fixture, http, host } = await open();
        http.expectOne((r) => r.url.endsWith('/get-observability-usage')).flush({ data: USAGE });
        fixture.componentInstance.openRequests({ route: '/api/v1/sales/order/get-order-list' });
        fixture.detectChanges();
        await settle(fixture);
        const list = http.match((r) => r.url.endsWith('/get-request-list')).find((r) => !r.cancelled)!;
        expect(list.request.params.get('route')).toBe('/api/v1/sales/order/get-order-list');
        list.flush({ data: { rows: [{ oid: 'r-1', occurred_on: '2026-10-20T10:00:00Z', method: 'POST', route: '/api/v1/sales/order/create', path: '/api/v1/sales/order/create', unmatched_route: false, status: 500, duration_ms: 1200, ip: '203.0.113.9', country: 'BD', city: 'Dhaka', device: null, login_oid: 'l-1', name: 'Rafi', email: 'rafi@shop.test' }] }, total: 1 });
        await settle(fixture);
        (host.querySelector('[data-health="requests"] [data-action="open"]') as HTMLButtonElement).click();
        fixture.detectChanges();
        http.expectOne((r) => r.url.endsWith('/get-request-details/r-1')).flush({ data: { oid: 'r-1', occurred_on: '2026-10-20T10:00:00Z', method: 'POST', route: '/x', path: '/x', status: 500, duration_ms: 1200, ip: null, country: null, city: null, device: null, name: 'Rafi', email: null, request_body: { name: 'Lipstick' }, response_body: { message: 'boom' }, activity: [] } });
        fixture.detectChanges();
        await fixture.whenStable();
        expect(document.querySelector('[data-body="request"]')?.textContent).toContain('Lipstick');
        expect(document.querySelector('[data-body="response"]')?.textContent).toContain('boom');
    });

    it('says the person may not see it when the server refuses', async () => {
        const { fixture, http, host } = await open();
        http.expectOne((r) => r.url.endsWith('/get-observability-usage')).flush({ code: 403 }, { status: 403, statusText: 'Forbidden' });
        fixture.detectChanges();
        expect(host.querySelector('[data-health="usage-failed"]')?.textContent).toContain('system.health.failed.forbidden');
    });
});
