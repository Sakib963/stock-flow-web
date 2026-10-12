import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ActivityEntry, ActivitySummary } from '@app/core/models/activity-log.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { businessToday } from '@app/shared/utils/business-time/business-time';
import { ActivityLogComponent } from './activity-log.component';

const now = new Date().toISOString();
const entry = (over: Partial<ActivityEntry>): ActivityEntry => ({
    oid: 'a-1',
    reference_type: 'order',
    reference_oid: 'o-1',
    title: 'Online order confirmed',
    description: 'Order 2610120004 confirmed by phone',
    performed_by: 'nusrat@shop.test',
    performed_by_name: 'Nusrat Jahan',
    performed_on: now,
    area: 'sales',
    attention: false,
    record_exists: true,
    device: { browser: 'Chrome', os: 'Windows', type: 'desktop' },
    city: null,
    ...over,
});

const SUMMARY: ActivitySummary = {
    actions: 3,
    attention: 1,
    people_count: 2,
    busiest_hour: 17,
    people: [
        { email: 'nusrat@shop.test', name: 'Nusrat Jahan', actions: 2, last_seen: now },
        { email: 'rafi@shop.test', name: null, actions: 1, last_seen: now },
    ],
    areas: [
        { area: 'sales', actions: 2 },
        { area: 'inventory', actions: 1 },
    ],
    week: [{ day: 1, hour: 17, actions: 3 }],
};

const ROWS = [entry({}), entry({ oid: 'a-2', title: 'Online order cancelled', attention: true, performed_by: 'rafi@shop.test', performed_by_name: null }), entry({ oid: 'a-3', reference_type: 'product', title: 'Deleted product', area: 'configuration', record_exists: false, device: null })];

const open = async (granted = ['activity-log.activity-log.view', 'sales.order.view', 'configuration.product.view']) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await TestBed.configureTestingModule({
        imports: [ActivityLogComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), menu: () => [] } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ActivityLogComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.tick();
    const list = http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_LIST));
    list.flush({ code: 200, data: { rows: ROWS }, total: 64 });
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_SUMMARY)).flush({ code: 200, data: SUMMARY });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, element: fixture.nativeElement as HTMLElement, firstParams: list.request.params };
};

describe('ActivityLogComponent', () => {
    afterEach(() => vi.useRealTimers());

    it('opens on the last seven business days', async () => {
        const { firstParams } = await open();
        expect(firstParams.get('date_to')).toBe(businessToday());
        expect(firstParams.get('offset')).toBe('0');
        expect(firstParams.get('date_from')).not.toBeNull();
    });

    it('shows each entry with who did it, flags the ones worth a look, and links only a record that exists and may be opened', async () => {
        const { element, page } = await open();
        const entries = element.querySelectorAll('[data-entry]');
        expect(entries.length).toBe(3);
        expect(entries[0].textContent).toContain('Nusrat Jahan');
        expect(entries[1].textContent).toContain('rafi@shop.test');
        expect(entries[1].getAttribute('data-attention')).toBe('true');
        expect(page.linkOf(ROWS[0])).toBe('/app/sales/orders/o-1');
        expect(page.linkOf(ROWS[2])).toBeNull();
        expect(page.deviceLabel(ROWS[0])).not.toBeNull();
        expect(page.deviceLabel(ROWS[2])).toBeNull();
        expect(page.days()[0].labelKey).toBe('activityLog.today');
    });

    it('offers no link to a page the person may not open', async () => {
        const { page } = await open(['activity-log.activity-log.view']);
        expect(page.linkOf(ROWS[0])).toBeNull();
    });

    it('narrows the feed from a number on the side, and lets go when it is pressed again', async () => {
        const { page, http } = await open();
        page.filterBy('person', 'rafi@shop.test');
        TestBed.tick();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_LIST));
        expect(sent.request.params.get('person')).toBe('rafi@shop.test');
        sent.flush({ code: 200, data: { rows: [] }, total: 0 });
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_SUMMARY)).flush({ code: 200, data: SUMMARY });
        page.filterBy('person', 'rafi@shop.test');
        TestBed.tick();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_LIST)).request.params.has('person')).toBe(false);
    });

    it('turns Worth a look into a switch for the feed', async () => {
        const { page, http } = await open();
        page.filterBy('attention', 'true');
        TestBed.tick();
        expect(page.onlyAttention()).toBe(true);
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_LIST)).request.params.get('attention')).toBe('true');
    });

    it('numbers the pages from the total, opens one in place of the last, and starts again at page one when the filters change', async () => {
        const { page, http, element } = await open();
        expect(element.querySelector('[data-activity="pager"]')).not.toBeNull();
        Element.prototype.scrollIntoView = vi.fn();
        page.goTo(3);
        const third = http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_LIST));
        expect(third.request.params.get('offset')).toBe('60');
        http.expectNone((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_SUMMARY));
        third.flush({ code: 200, data: { rows: [entry({ oid: 'a-61' })] }, total: 64 });
        expect(page.entries().map((e) => e.oid)).toEqual(['a-61']);
        page.filterBy('area', 'sales');
        TestBed.tick();
        expect(page.pageIndex()).toBe(1);
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_LIST)).request.params.get('offset')).toBe('0');
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_SUMMARY)).flush({ code: 200, data: SUMMARY });
    });

    it('waits for a pause before searching', async () => {
        const { page, http } = await open();

        page.search.set('cancel');
        TestBed.tick();
        http.expectNone((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_LIST));
        vi.advanceTimersByTime(400);
        TestBed.tick();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_LIST)).request.params.get('search')).toBe('cancel');
    });

    it('says the totals did not load and offers to try again, instead of loading for ever', async () => {
        const { page, http, fixture, element } = await open();
        page.filterBy('area', 'sales');
        TestBed.tick();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_LIST)).flush({ code: 200, data: { rows: ROWS }, total: 3 });
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_SUMMARY)).flush({ code: 500, message: 'fault' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();
        expect(element.querySelector('[data-activity="summary-failed"]')).not.toBeNull();
        expect(element.querySelectorAll('[data-entry]').length).toBe(3);
        page.reloadSummary();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_ACTIVITY_LOG_SUMMARY)).flush({ code: 200, data: SUMMARY });
        fixture.detectChanges();
        expect(element.querySelector('[data-activity="summary-failed"]')).toBeNull();
    });

    it('names the busiest hour as a span on the clock', async () => {
        const { page } = await open();
        expect(page.hourSpan(17)).toContain('activityLog.hourSpan');
    });
});
