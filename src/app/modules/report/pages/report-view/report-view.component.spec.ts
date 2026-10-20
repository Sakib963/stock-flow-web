import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ReportResult } from '@app/core/models/report.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { ReportViewComponent } from './report-view.component';

const REGISTER: ReportResult = {
    title: 'Sales register',
    period: { date_from: '2026-10-01', date_to: '2026-10-20' },
    columns: [
        { key: 'day', label: 'Date', type: 'day', total: false },
        { key: 'invoice_no', label: 'Invoice', type: 'code', total: false },
        { key: 'channel', label: 'Channel', type: 'channel', total: false },
        { key: 'sales', label: 'Sales', type: 'money', total: true },
    ],
    totals: { sales: 1500, sales_count: 2, units_without_cost: 3 },
    rows: [
        { day: '2026-10-05', invoice_no: 'INV-1', channel: 'POS', sales: 1000 },
        { day: '2026-10-06', invoice_no: 'INV-2', channel: 'ONLINE', sales: 500 },
    ],
    row_count: 2,
};

const open = async ({ report = 'sales-register', group = 'sales', granted = ['report.sales.view', 'report.sales.export', 'sales.pos.view', 'sales.online.view'] }: { report?: string; group?: string; granted?: string[] } = {}) => {
    await TestBed.configureTestingModule({
        imports: [ReportViewComponent],
        providers: [
            provideRouter([]),
            provideHttpClient(),
            provideHttpClientTesting(),
            provideNzI18n(en_US),
            provideNzDateFnsAdapter(),
            provideTranslateService({ fallbackLang: 'en' }),
            ...OVERLAY_PROVIDERS,
            { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), menu: () => [], business: () => ({ name: 'Boutique' }) } },
            { provide: ActivatedRoute, useValue: { data: of({ group }), paramMap: of(convertToParamMap({ report })) } },
        ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', { report: { value: { channel: { POS: 'Counter', ONLINE: 'Online' } } } });
    const fixture = TestBed.createComponent(ReportViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, http: TestBed.inject(HttpTestingController), element: fixture.nativeElement as HTMLElement };
};

const flush = async (ctx: Awaited<ReturnType<typeof open>>, data: ReportResult = REGISTER) => {
    const request = ctx.http.expectOne((r) => r.url.includes(APIEndpoint.GET_SALES_REPORT));
    request.flush({ code: 200, message: 'ok', data });
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    ctx.fixture.detectChanges();
    return request;
};

describe('ReportViewComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('runs the report for this month so far, naming the report', async () => {
        const ctx = await open();
        const request = await flush(ctx);
        expect(request.request.params.get('report')).toBe('sales-register');
        expect(request.request.params.get('date_from')?.endsWith('-01')).toBe(true);
    });

    it('sends no period to a report that is as at now', async () => {
        const ctx = await open({ report: 'customer-dues' });
        const request = await flush(ctx, { ...REGISTER, period: null });
        expect(request.request.params.has('date_from')).toBe(false);
    });

    it('shows the count of sales and each summed column above the rows, and warns about units with no cost', async () => {
        const ctx = await open();
        await flush(ctx);
        const totals = [...ctx.element.querySelectorAll('[data-total]')].map((t) => t.getAttribute('data-total'));
        expect(totals).toEqual(['sales_count', 'sales']);
        expect(ctx.element.querySelector('[data-report="without-cost"]')).toBeTruthy();
    });

    it('draws stored codes as words', async () => {
        const ctx = await open();
        await flush(ctx);
        expect(ctx.fixture.componentInstance.rows().map((r) => r['channel'])).toEqual(['Counter', 'Online']);
    });

    it('offers Excel and Print only to someone who may export', async () => {
        const viewer = await open({ granted: ['report.sales.view', 'sales.pos.view'] });
        await flush(viewer);
        expect(viewer.element.querySelector('[data-report="download"]')).toBeNull();
        expect(viewer.element.querySelector('[data-report="print"]')).toBeNull();
    });

    it('asks for the spreadsheet with the same filters when Download is pressed, and shows it is working', async () => {
        const ctx = await open();
        await flush(ctx);
        (ctx.element.querySelector('[data-report="download"]') as HTMLButtonElement).click();
        ctx.fixture.detectChanges();
        const request = ctx.http.expectOne((r) => r.url.includes(APIEndpoint.DOWNLOAD_SALES_REPORT));
        expect(request.request.params.get('report')).toBe('sales-register');
        expect(ctx.fixture.componentInstance.downloading()).toBe(true);
        expect((ctx.element.querySelector('[data-report="download"]') as HTMLButtonElement).disabled).toBe(true);
        request.flush(new Blob(['x']), { headers: { 'X-Filename': 'Sales%20register.xlsx' } });
    });

    it('offers no download or print of an empty report', async () => {
        const ctx = await open();
        await flush(ctx, { ...REGISTER, rows: [], row_count: 0, totals: {} });
        expect((ctx.element.querySelector('[data-report="download"]') as HTMLButtonElement).disabled).toBe(true);
        expect((ctx.element.querySelector('[data-report="print"]') as HTMLButtonElement).disabled).toBe(true);
    });

    it('will not print more rows than paper holds', async () => {
        const ctx = await open();
        await flush(ctx, { ...REGISTER, row_count: 9000 });
        expect((ctx.element.querySelector('[data-report="print"]') as HTMLButtonElement).disabled).toBe(true);
    });

    it('asks the server for one page at a time, and for the next page when it turns', async () => {
        const ctx = await open();
        const first = await flush(ctx, { ...REGISTER, row_count: 60 });
        expect([first.request.params.get('offset'), first.request.params.get('limit')]).toEqual(['0', '25']);
        ctx.fixture.componentInstance.page.set({ page: 2, size: 25 });
        ctx.fixture.detectChanges();
        const second = ctx.http.expectOne((r) => r.url.includes(APIEndpoint.GET_SALES_REPORT));
        expect(second.request.params.get('offset')).toBe('25');
        second.flush({ code: 200, message: 'ok', data: { ...REGISTER, row_count: 60 } });
    });

    it('fetches every row only when Print is pressed', async () => {
        const ctx = await open();
        await flush(ctx);
        ctx.fixture.componentInstance.print();
        const all = ctx.http.expectOne((r) => r.url.includes(APIEndpoint.GET_SALES_REPORT));
        expect([all.request.params.get('offset'), all.request.params.get('limit')]).toEqual(['0', '5000']);
        expect(ctx.fixture.componentInstance.printing()).toBe(true);
    });

    it('says a report is too big rather than that the server failed', async () => {
        const ctx = await open();
        ctx.http.expectOne((r) => r.url.includes(APIEndpoint.GET_SALES_REPORT)).flush({ code: 400, message: 'too many' }, { status: 400, statusText: 'Bad Request' });
        ctx.fixture.detectChanges();
        expect(ctx.fixture.componentInstance.failed()).toBe('tooBig');
    });

    it('keeps supplier dues from someone who may not see buying prices, without asking the server', async () => {
        const ctx = await open({ group: 'stock', report: 'supplier-dues', granted: ['report.stock.view'] });
        expect(ctx.fixture.componentInstance.definition()).toBeNull();
        expect(ctx.http.match(() => true).length).toBe(0);
    });
});
