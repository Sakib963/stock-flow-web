import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { WarehouseDetailComponent } from './warehouse-detail.component';

const DETAILS = {
    code: 200,
    message: 'ok',
    data: {
        details: { oid: 'cat-1', name: 'Saree', code: 'SARE', location: 'Mohammadpur', capacity_units: 80000, status: 'Active', created_by: 'owner@samiha.test', created_on: '2026-09-01T10:00:00.000', last_action_by: 'owner@samiha.test', last_action_on: '2026-09-20T10:00:00.000' },
        stats: { products: 12, onHand: 340, sellable: 336, value: 48250, unplaced: 7, lowStock: 2, zones: 3, fullRate: null },
        activity: [{ oid: 'log-1', date: '2026-09-20T10:00:00.000', user: 'owner@samiha.test', action: 'Updated warehouse', description: 'Status changed from "Inactive" to "Active"' }],
    },
};

/** The row the list hands over when a warehouse is opened from it: no stats, no activity, no creator. */
const LIST_ROW = { oid: 'cat-1', name: 'Saree', code: 'SARE', location: 'Mohammadpur', status: 'Active', created_on: '2026-09-01T10:00:00.000', last_action_by: 'owner@samiha.test', last_action_on: '2026-09-20T10:00:00.000' };

const open = async (permissions: string[] = ['configuration.warehouse.view', 'configuration.warehouse.edit'], row?: object) => {
    await TestBed.configureTestingModule({
        imports: [WarehouseDetailComponent],
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
    const fixture = TestBed.createComponent(WarehouseDetailComponent);
    fixture.detectChanges();
    return fixture;
};

describe('WarehouseDetailComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('shows the record, the numbers someone would otherwise count by hand, and its activity', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Saree');
        expect(text).toContain('SARE');
        expect(text).toContain('12');
        expect(text).toContain('340');
        expect(text).toContain('Status changed from "Inactive" to "Active"');
    });

    it('leaves Edit out for someone who may only view, rather than showing it greyed out', async () => {
        const fixture = await open(['configuration.warehouse.view']);
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
        expect(buttons.some((b) => b.textContent?.includes('configuration.warehouse.edit'))).toBe(false);
    });

    it('names the page rather than the record, so the header never waits for the request', async () => {
        const fixture = await open();
        const element = fixture.nativeElement as HTMLElement;

        expect(element.querySelector('h1')?.textContent).toContain('configuration.warehouse.detailTitle');
        expect(element.querySelector('[data-page-header="lead"]')?.textContent).toContain('configuration.warehouse.detailLead');

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
    });

    it('draws the details from the row the list already had, before the request answers', async () => {
        const fixture = await open(undefined, LIST_ROW);
        const details = (fixture.nativeElement as HTMLElement).querySelector('[data-detail="details"]')!;

        expect(details.textContent).toContain('Saree');
        expect(details.textContent).toContain('SARE');
        expect(details.querySelector('status-tag')).toBeTruthy();

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
    });

    // Navigation state survives a reload and a Back, so a row for another warehouse can be lying there.
    it('ignores a row that belongs to a different warehouse', async () => {
        const fixture = await open(undefined, { ...LIST_ROW, oid: 'cat-2', name: 'Footwear' });
        const details = (fixture.nativeElement as HTMLElement).querySelector('[data-detail="details"]')!;

        expect(details.textContent).not.toContain('Footwear');
        expect(details.querySelector('nz-skeleton')).toBeTruthy();

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
    });

    it('puts the details first with the location inside them, then the numbers, the actions and the activity', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const order = [...(fixture.nativeElement as HTMLElement).querySelectorAll('[data-detail]')].map((el) => el.getAttribute('data-detail'));
        expect(order).toEqual(['details', 'location', 'stats', 'quick-actions', 'activity']);
    });

    it('marks stock in no aisle, and says no capacity is set rather than 0% full', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('[data-stat="unplaced"] .text-warning-ink')?.textContent).toContain('7');
        expect(element.querySelector('[data-stat="full"]')?.textContent).toContain('configuration.warehouse.noCapacity');
    });

    it('shows the activity as a timeline, one entry per change', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-detail="activity"] nz-timeline-item').length).toBe(1);
    });

    it('offers the product and analytics actions disabled, with the reason beside them', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        const coming = [...element.querySelectorAll<HTMLButtonElement>('[data-quick]')];
        expect(coming.length).toBe(3);
        coming.forEach((button) => {
            expect(button.disabled).toBe(true);
            expect(element.querySelector('#' + button.getAttribute('aria-describedby'))?.textContent).toContain('configuration.warehouse.quick.notReady');
        });
    });

    it('offers both reports to someone who may export, and neither to someone who may not', async () => {
        const allowed = await open(['configuration.warehouse.view', 'configuration.warehouse.export']);
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
        allowed.detectChanges();

        const text = (allowed.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('configuration.warehouse.report.products');
        expect(text).toContain('configuration.warehouse.report.inventory');
    });

    it('leaves the reports out entirely for someone who may only view', async () => {
        const fixture = await open(['configuration.warehouse.view']);
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).not.toContain('configuration.warehouse.report.products');
        expect(text).not.toContain('configuration.warehouse.report.inventory');
    });

    it('asks the server for the report the person pressed, as a file', async () => {
        const fixture = await open(['configuration.warehouse.view', 'configuration.warehouse.export']);
        const http = TestBed.inject(HttpTestingController);
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS)).flush(DETAILS);
        fixture.detectChanges();

        fixture.componentInstance.download('inventory');
        const request = http.expectOne((r) => r.url.endsWith(APIEndpoint.GENERATE_INVENTORY_REPORT_BY_WAREHOUSE));

        expect(request.request.body).toEqual({ oid: 'cat-1' });
        expect(request.request.responseType).toBe('blob');
        request.flush(new Blob(['x']));
    });

    it('says the record could not be loaded and offers another go, rather than showing an empty page', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush({ code: 500, message: 'boom' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('configuration.warehouse.loadFailed');
        expect(text).toContain('form.retry');
    });
});
