import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { AisleDetailComponent } from './aisle-detail.component';

const DETAILS = {
    code: 200,
    message: 'ok',
    data: {
        details: { oid: 'sc-1', name: 'Sarees', code: 'SARE', warehouse_oid: 'c1', warehouse_name: 'Clothing', storage_type: 'shelf', capacity_units: null, special_notes: null, status: 'Active', created_by: 'owner@samiha.test', created_on: '2026-09-01T10:00:00.000', last_action_by: 'owner@samiha.test', last_action_on: '2026-09-20T10:00:00.000' },
        stats: { products: 2, onHand: 140, sellable: 136, value: 48250, lowStock: 1, fullRate: null },
        items: [
            { product_oid: 'p1', name: 'Rose Water Toner', onHand: 3, sellable: 3, low: true },
            { product_oid: 'p2', name: 'Saree', onHand: 137, sellable: 133, low: false },
        ],
        activity: [{ oid: 'log-1', date: '2026-09-20T10:00:00.000', user: 'owner@samiha.test', action: 'Created aisle', description: 'Created aisle "Sarees" with code SARE' }],
    },
};

const open = async (permissions: string[], response: object = DETAILS) => {
    await TestBed.configureTestingModule({
        imports: [AisleDetailComponent],
        providers: [
            provideRouter([]),
            provideHttpClient(),
            provideHttpClientTesting(),
            provideNzI18n(en_US),
            provideTranslateService({ fallbackLang: 'en' }),
            { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'sc-1']]) } } },
            { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } },
        ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AisleDetailComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_AISLE_DETAILS))
        .flush(response);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
};

describe('AisleDetailComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('shows the record, its warehouse and its numbers', async () => {
        const text = (await open(['configuration.aisle.view'])).textContent ?? '';
        expect(text).toContain('Sarees');
        expect(text).toContain('Clothing');
        expect(text).toContain('140');
        expect(text).toContain('Created aisle "Sarees"');
    });

    it('lists what is on the aisle with the low ones marked, and says no capacity is set rather than 0% full', async () => {
        const element = await open(['configuration.aisle.view']);
        const rows = [...element.querySelectorAll('[data-detail="items"] [data-item]')];

        expect(rows.map((row) => row.querySelector('td')?.textContent?.trim().split(/\s+/)[0])).toEqual(['Rose', 'Saree']);
        expect(rows[0].querySelector('status-tag')).not.toBeNull();
        expect(rows[1].querySelector('status-tag')).toBeNull();
        expect(element.querySelector('[data-stat="full"]')?.textContent).toContain('configuration.aisle.noCapacity');
    });

    it('pages a long aisle ten products at a time, so the card keeps one height', async () => {
        const items = Array.from({ length: 12 }, (_, i) => ({ product_oid: 'p' + i, name: 'Product ' + String(i).padStart(2, '0'), onHand: 1, sellable: 1, low: false }));
        const element = await open(['configuration.aisle.view'], { ...DETAILS, data: { ...DETAILS.data, items } });

        expect(element.querySelectorAll('[data-detail="items"] [data-item]').length).toBe(10);
        expect(element.querySelector('[data-detail="items"] nz-pagination')).not.toBeNull();
    });

    it('links the warehouse to its record only for someone who may view warehouses', async () => {
        expect((await open(['configuration.aisle.view', 'configuration.warehouse.view'])).querySelector('[data-detail="warehouse"] a')).not.toBeNull();
        TestBed.resetTestingModule();
        expect((await open(['configuration.aisle.view'])).querySelector('[data-detail="warehouse"] a')).toBeNull();
    });

    it('leaves Edit and both reports out for someone who may only view', async () => {
        const element = await open(['configuration.aisle.view']);
        const buttons = [...element.querySelectorAll('button')];
        expect(buttons.some((b) => b.textContent?.includes('configuration.aisle.edit'))).toBe(false);
        expect(element.querySelectorAll('[data-report]').length).toBe(0);
    });

    it('offers both reports to someone who may export', async () => {
        const element = await open(['configuration.aisle.view', 'configuration.aisle.export']);
        expect(element.querySelectorAll('[data-report]').length).toBe(2);
    });
});
