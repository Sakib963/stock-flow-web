import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { SupplierDetailComponent } from './supplier-detail.component';

const DETAILS = {
    code: 200,
    message: 'ok',
    data: {
        details: { oid: 'cat-1', name: 'Saree', contact_person: 'Ritu', phone_number: '01911223344', whatsapp_number: null, email: null, address: 'New Market', payment_details: 'bKash 01911223344', status: 'Active', created_by: 'owner@arithmalabs.test', created_on: '2026-09-01T10:00:00.000', last_action_by: 'owner@arithmalabs.test', last_action_on: '2026-09-20T10:00:00.000' },
        stats: { orders: 3, openOrders: 1, spent: 66319, paid: 40069, owed: 26250, receivedValue: 62119, lastPurchaseOn: '2026-03-20T05:06:12.000', leadDays: 2, promisedOrders: 0, onTimeRate: null, unitsOrdered: 123, unitsReceived: 117, shortRate: 4.9, faultyUnits: 0, faultyRate: 0, unitsSold: 10, sellThrough: 8.5, sales: 9740, profit: 3040 },
        activity: [{ oid: 'log-1', date: '2026-09-20T10:00:00.000', user: 'owner@arithmalabs.test', action: 'Updated supplier', description: 'Status changed from "Inactive" to "Active"' }],
    },
};

/** The row the list hands over when a supplier is opened from it: no stats, no activity, no creator. */
const LIST_ROW = { oid: 'cat-1', name: 'Saree', contact_person: 'Ritu', phone_number: '01911223344', status: 'Active', created_on: '2026-09-01T10:00:00.000', last_action_by: 'owner@arithmalabs.test', last_action_on: '2026-09-20T10:00:00.000' };

const open = async (permissions: string[] = ['configuration.supplier.view', 'configuration.supplier.edit'], row?: object) => {
    await TestBed.configureTestingModule({
        imports: [SupplierDetailComponent],
        providers: [
            provideRouter([]),
            provideHttpClient(),
            provideHttpClientTesting(),
            provideNzI18n(en_US),
            provideTranslateService({ fallbackLang: 'en' }),
            { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'cat-1']]) } } },
            // The page header reads the menu for its breadcrumb, so the fake has to answer it.
            { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } },
        ],
    }).compileComponents();

    if (row) {
        // The page reads the row while the navigation that opened it is still current.
        Object.defineProperty(TestBed.inject(Router), 'currentNavigation', { value: () => ({ extras: { state: { row } } }) });
    }
    const fixture = TestBed.createComponent(SupplierDetailComponent);
    fixture.detectChanges();
    return fixture;
};

describe('SupplierDetailComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('shows the record, the numbers someone would otherwise count by hand, and its activity', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Saree');
        expect(text).toContain('26,250.00');
        expect(text).toContain('01911223344');
        expect(text).toContain('Status changed from "Inactive" to "Active"');
    });

    it('leaves Edit out for someone who may only view, rather than showing it greyed out', async () => {
        const fixture = await open(['configuration.supplier.view']);
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
        expect(buttons.some((b) => b.textContent?.includes('configuration.supplier.edit'))).toBe(false);
    });

    it('names the page rather than the record, so the header never waits for the request', async () => {
        const fixture = await open();
        const element = fixture.nativeElement as HTMLElement;

        expect(element.querySelector('h1')?.textContent).toContain('configuration.supplier.detailTitle');
        expect(element.querySelector('[data-page-header="lead"]')?.textContent).toContain('configuration.supplier.detailLead');

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
    });

    it('draws the details from the row the list already had, before the request answers', async () => {
        const fixture = await open(undefined, LIST_ROW);
        const details = (fixture.nativeElement as HTMLElement).querySelector('[data-detail="details"]')!;

        expect(details.textContent).toContain('Saree');
        expect(details.querySelector('status-tag')).toBeTruthy();

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
    });

    // Navigation state survives a reload and a Back, so a row for another supplier can be lying there.
    it('ignores a row that belongs to a different supplier', async () => {
        const fixture = await open(undefined, { ...LIST_ROW, oid: 'cat-2', name: 'Footwear' });
        const details = (fixture.nativeElement as HTMLElement).querySelector('[data-detail="details"]')!;

        expect(details.textContent).not.toContain('Footwear');
        expect(details.querySelector('nz-skeleton')).toBeTruthy();

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
    });

    it('puts the details first with the address and payment details inside them, then the two strips of numbers, the actions and the activity', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const order = [...(fixture.nativeElement as HTMLElement).querySelectorAll('[data-detail]')].map((el) => el.getAttribute('data-detail'));
        expect(order).toEqual(['details', 'address', 'payment', 'stats-money', 'stats-quality', 'quick-actions', 'activity']);
    });

    it('marks what is still owed, and says there is not enough data rather than 0% when nothing had a promised date', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('[data-stat="owed"] .text-danger')?.textContent).toContain('26,250.00');
        expect(element.querySelector('[data-stat="onTime"]')?.textContent).toContain('configuration.supplier.notEnough');
        expect(element.querySelector('[data-stat="spent"]')?.textContent).toContain('configuration.supplier.detailStat.arrivedWorth');
    });

    it('shows the activity as a timeline, one entry per change', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-detail="activity"] nz-timeline-item').length).toBe(1);
    });

    it('offers the purchase order and product actions disabled, with the reason beside them', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        const coming = [...element.querySelectorAll<HTMLButtonElement>('[data-quick]')];
        expect(coming.length).toBe(2);
        coming.forEach((button) => {
            expect(button.disabled).toBe(true);
            expect(element.querySelector('#' + button.getAttribute('aria-describedby'))?.textContent).toContain('configuration.supplier.quick.notReady');
        });
    });

    it('offers both reports to someone who may export, and neither to someone who may not', async () => {
        const allowed = await open(['configuration.supplier.view', 'configuration.supplier.export']);
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
        allowed.detectChanges();

        const text = (allowed.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('configuration.supplier.report.performance');
        expect(text).toContain('configuration.supplier.report.data');
    });

    it('leaves the reports out entirely for someone who may only view', async () => {
        const fixture = await open(['configuration.supplier.view']);
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).not.toContain('configuration.supplier.report.performance');
        expect(text).not.toContain('configuration.supplier.report.data');
    });

    it('asks the server for the report the person pressed, as a file', async () => {
        const fixture = await open(['configuration.supplier.view', 'configuration.supplier.export']);
        const http = TestBed.inject(HttpTestingController);
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS)).flush(DETAILS);
        fixture.detectChanges();

        fixture.componentInstance.download('performance');
        const request = http.expectOne((r) => r.url.endsWith(APIEndpoint.GENERATE_SUPPLIER_PERFORMANCE_REPORT));

        expect(request.request.body).toEqual({ oid: 'cat-1' });
        expect(request.request.responseType).toBe('blob');
        request.flush(new Blob(['x']));
    });

    it('says the record could not be loaded and offers another go, rather than showing an empty page', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUPPLIER_DETAILS))
            .flush({ code: 500, message: 'boom' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('configuration.supplier.loadFailed');
        expect(text).toContain('form.retry');
    });
});
