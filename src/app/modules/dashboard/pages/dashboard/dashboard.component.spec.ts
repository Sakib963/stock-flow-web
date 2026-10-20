import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { Dashboard } from '@app/core/models/dashboard.model';
import { SessionService } from '@app/core/services/session/session.service';
import { DashboardComponent } from './dashboard.component';

const PERIOD = { key: 'today' as const, date_from: '2026-10-19', date_to: '2026-10-19', previous_from: '2026-10-18', previous_to: '2026-10-18' };

const open = async (data: Partial<Dashboard>, held: string[] = []) => {
    localStorage.clear();
    await TestBed.configureTestingModule({
        imports: [DashboardComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    vi.spyOn(TestBed.inject(SessionService), 'can').mockImplementation((code: string) => held.includes(code));
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith('/get-dashboard') && r.params.get('period') === 'today')
        .flush({ data: { period: PERIOD, for_you: null, your_work: null, attention: null, ...data } });
    fixture.detectChanges();
    return fixture;
};

const q = (host: HTMLElement, selector: string) => host.querySelector(selector);

describe('DashboardComponent', () => {
    it('welcomes someone who holds no feature it summarises, with no period switch', async () => {
        const host: HTMLElement = (await open({})).nativeElement;
        expect(q(host, '[data-dashboard="nothing"]')).not.toBeNull();
        expect(q(host, '[data-dashboard="period"]')).toBeNull();
    });

    it('shows a counter person their own sales, the change against yesterday and their quick actions', async () => {
        const host: HTMLElement = (await open({ for_you: { counter: { sales: 1800, orders: 3, previous_sales: 1200, previous_orders: 2 }, online: null, drafts: { parked: 1, online: 0 } } }, ['sales.pos.create'])).nativeElement;
        expect(q(host, '[data-tile="counter"]')).not.toBeNull();
        expect(q(host, '[data-tile="counter"] [data-change]')?.textContent).toContain('50%');
        expect(q(host, '[data-tile="waiting"]')).not.toBeNull();
        expect(q(host, '[data-action="counterSale"]')).not.toBeNull();
        expect(q(host, '[data-action="purchaseOrder"]')).toBeNull();
        expect(q(host, '[data-dashboard="period"]')).not.toBeNull();
    });

    it('lists what waits in a fixed order, and says all clear when nothing does', async () => {
        const host: HTMLElement = (
            await open({
                attention: [
                    { key: 'out_of_stock', count: 3 },
                    { key: 'orders_to_confirm', count: 2, oldest_on: '2026-10-19T03:00:00Z' },
                ],
            })
        ).nativeElement;
        const keys = [...host.querySelectorAll('[data-attention]')].map((a) => a.getAttribute('data-attention'));
        expect(keys).toEqual(['orders_to_confirm', 'out_of_stock']);
        expect(q(host, '[data-attention="orders_to_confirm"] [data-count]')?.textContent).toContain('2');
        expect(q(host, '[data-attention="orders_to_confirm"] ng-icon svg, [data-attention="orders_to_confirm"] ng-icon')).not.toBeNull();
    });

    it('says nothing is waiting instead of a row of zeros', async () => {
        const host: HTMLElement = (await open({ attention: [] })).nativeElement;
        expect(q(host, '[data-attention="clear"]')).not.toBeNull();
    });

    it('draws the business figures with a bar for every day of the period, sales or not', async () => {
        const fixture = await open({
            period: { key: 'week', date_from: '2026-10-13', date_to: '2026-10-19', previous_from: '2026-10-06', previous_to: '2026-10-12' },
            business: {
                current: { sales: 2000, profit: 800, orders: 4, average: 500 },
                previous: { sales: 1000, profit: 0, orders: 4, average: 250 },
                units_without_cost: 2,
                daily: [{ day: '2026-10-15', sales: 2000, profit: 800 }],
                previous_daily: [{ day: '2026-10-08', sales: 1000, profit: 300 }],
                top: [{ oid: 'p1', name: 'Kurti', photo_thumb: null, units: 4, sales: 500 }],
                by_channel: [
                    { channel: 'ONLINE', sales: 500 },
                    { channel: 'POS', sales: 1500 },
                ],
            },
        });
        const host: HTMLElement = fixture.nativeElement;
        expect(host.querySelectorAll('[data-bar]').length).toBe(7);
        expect(q(host, '[data-tile="sales"] [data-change]')?.textContent).toContain('100%');
        expect(q(host, '[data-tile="profit"] [data-change]')).toBeNull();
        expect(q(host, '[data-note="without-cost"]')).not.toBeNull();
        expect(q(host, '[data-top="p1"]')).not.toBeNull();
        expect(q(host, '[data-top="p1"] ng-icon[name="lucidePackage"] svg')).not.toBeNull();
        expect(q(host, '[data-top="p1"] [aria-hidden] > span')?.getAttribute('style')).toContain('25%');
        expect(q(host, '[data-bar="2026-10-15"] [data-before]')?.getAttribute('style')).toContain('50%');
        expect(q(host, '[data-channel="POS"]')?.textContent).toContain('75');
        expect(q(host, '[data-dashboard="readout"]')?.textContent).toContain('dashboard.business.wholePeriod');
        (q(host, '[data-bar="2026-10-15"]') as HTMLElement).dispatchEvent(new Event('pointerenter'));
        fixture.detectChanges();
        expect(q(host, '[data-dashboard="readout"]')?.textContent).not.toContain('dashboard.business.wholePeriod');
        expect(q(host, '[data-dashboard="period"]')).not.toBeNull();
    });

    it('greets with the date, sums up the day in a sentence and names the first thing waiting', async () => {
        const host: HTMLElement = (
            await open({
                for_you: { counter: { sales: 1800, orders: 3, previous_sales: 1200, previous_orders: 2 }, online: null, drafts: { parked: 0, online: 0 } },
                attention: [
                    { key: 'low_on_stock', count: 6 },
                    { key: 'orders_to_confirm', count: 2 },
                ],
            })
        ).nativeElement;
        expect(q(host, '[data-dashboard="welcome"] h1')?.textContent).toContain('dashboard.greeting.');
        expect(q(host, '[data-welcome="day"]')?.textContent?.trim()).not.toBe('');
        expect(q(host, '[data-welcome="clock"]')).toBeNull();
        const summary = q(host, '[data-welcome="summary"]')?.textContent ?? '';
        expect(summary).toContain('dashboard.welcome.counter');
        expect(summary).toContain('dashboard.welcome.up');
        expect(summary).toContain('dashboard.welcome.firstUp');
    });

    it("shows a person's own work: today, active days, streak, when they work and their latest actions", async () => {
        const recent = [
            { oid: 'a1', reference_type: 'brand', reference_oid: 'b1', title: 'Created brand', description: 'Cosrx', performed_on: '2026-10-19T03:00:00Z', area: 'configuration' as const, record_exists: true },
            { oid: 'a2', reference_type: 'order', reference_oid: 'o1', title: 'Sold at the counter', description: null, performed_on: '2026-10-19T02:00:00Z', area: 'sales' as const, record_exists: true },
        ];
        const host: HTMLElement = (await open({ your_work: { today: 4, active_days: 12, streak: 3, week: [{ day: 6, hour: 15, count: 9 }], recent } }, ['configuration.brands.view'])).nativeElement;
        expect(q(host, '[data-work="streak"] dd')?.textContent).toContain('3');
        expect(q(host, '[data-work="busiest"]')).not.toBeNull();
        expect(q(host, '[data-heatmap]')).not.toBeNull();
        expect(q(host, '[data-recent="a1"] a')?.getAttribute('href')).toBe('/app/configuration/brands/b1');
        expect(q(host, '[data-recent="a2"] a')).toBeNull();
        expect(q(host, '[data-dashboard="nothing"]')).toBeNull();
    });

    it('spins the refresh icon and holds the button while loading, centred in its own square', async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();
        const fixture = TestBed.createComponent(DashboardComponent);
        fixture.detectChanges();
        const host: HTMLElement = fixture.nativeElement;
        const button = () => q(host, '[data-dashboard="refresh"]') as HTMLButtonElement;
        expect(button().disabled).toBe(true);
        expect(q(host, '[data-dashboard="refresh"] ng-icon')?.classList).toContain('animate-spin');
        expect(q(host, '[data-dashboard="refresh"] .ant-btn-loading-icon')).toBeNull();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.endsWith('/get-dashboard'))
            .flush({ data: { period: PERIOD, for_you: null, your_work: null, attention: null } });
        fixture.detectChanges();
        expect(button().disabled).toBe(false);
        expect(q(host, '[data-dashboard="refresh"] ng-icon')?.classList).not.toContain('animate-spin');
    });

    it('invites a person with no work yet instead of drawing an empty heatmap', async () => {
        const host: HTMLElement = (await open({ your_work: { today: 0, active_days: 0, streak: 0, week: [], recent: [] } })).nativeElement;
        expect(q(host, '[data-dashboard="work-none"]')).not.toBeNull();
        expect(q(host, '[data-heatmap]')).toBeNull();
    });

    it('shows the stock worth with a way into the stock overview', async () => {
        const host: HTMLElement = (await open({ stock: { stock_value: 30000, expected_revenue: 44000, profit_full: 14000, unpriced_batches: 0 } })).nativeElement;
        expect(q(host, '[data-tile="stock_value"]')).not.toBeNull();
        expect(q(host, '[data-dashboard="open-stock"] ng-icon')).not.toBeNull();
        expect(q(host, '[data-dashboard="nothing"]')).toBeNull();
    });

    it('says so when only the business figures failed, instead of a blank page', async () => {
        const host: HTMLElement = (await open({ business: { failed: true } })).nativeElement;
        expect(q(host, '[data-dashboard="section-failed"]')).not.toBeNull();
        expect(q(host, '[data-dashboard="nothing"]')).toBeNull();
    });

    it('shows a failed part in its place and still draws the rest', async () => {
        const host: HTMLElement = (await open({ attention: { failed: true }, for_you: { counter: null, online: { entered: 4, sold: 1, previous_entered: 0 }, drafts: { parked: 0, online: 0 } } }, ['sales.online.create'])).nativeElement;
        expect(q(host, '[data-tile="online"]')).not.toBeNull();
        expect(host.textContent).toContain('dashboard.sectionFailed');
    });
});
