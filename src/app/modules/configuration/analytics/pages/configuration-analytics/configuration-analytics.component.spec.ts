import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ConfigurationAnalytics } from '@app/core/models/configuration-analytics.model';
import { SessionService } from '@app/core/services/session/session.service';
import { ConfigurationAnalyticsComponent } from './configuration-analytics.component';

const DATA: ConfigurationAnalytics = {
    counts: { product: { active: 42, added: 3 }, category: { active: 6, added: 0 }, subCategory: { active: 14, added: 1 }, warehouse: { active: 2, added: 0 } },
    attention: [
        { key: 'productsWithoutPhoto', total: 7, items: [{ oid: 'p-1', name: 'Cotton saree', detail: null }] },
        { key: 'emptyAisles', total: 1, items: [{ oid: 'a-1', name: 'A2', detail: 'Main' }] },
        { key: 'emptyCategories', total: 0, items: [] },
    ],
    spread: {
        category: {
            total: 42,
            rows: [
                { oid: 'c-1', name: 'Sarees', products: 21 },
                { oid: 'c-2', name: 'Shoes', products: 12 },
            ],
            other: { groups: 4, products: 9 },
        },
        brand: {
            total: 42,
            rows: [
                { oid: null, name: null, products: 30 },
                { oid: 'b-1', name: 'Aarong', products: 12 },
            ],
            other: null,
        },
    },
    warehouses: [
        { oid: 'w-1', name: 'Main', onHand: 190, capacity: 200, fullRate: 95 },
        { oid: 'w-2', name: 'Shop floor', onHand: 40, capacity: null, fullRate: null },
    ],
    activity: [{ oid: 'log-1', type: 'category', recordOid: 'c-1', date: '2026-09-27T10:00:00.000', user: 'owner@samiha.test', action: 'Created category', description: null }],
};

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [ConfigurationAnalyticsComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: SessionService, useValue: { can: () => true, menu: () => [] } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfigurationAnalyticsComponent);
    fixture.detectChanges();
    return fixture;
};

const loaded = async (data: ConfigurationAnalytics = DATA) => {
    const fixture = await open();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_CONFIGURATION_ANALYTICS))
        .flush({ code: 200, message: 'ok', data });
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
};

describe('ConfigurationAnalyticsComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('draws a tile only for the features the server sent, with the child count under its parent', async () => {
        const { element } = await loaded();

        const tiles = [...element.querySelectorAll('[data-tile]')].map((t) => t.getAttribute('data-tile'));
        expect(tiles).toEqual(['product', 'category', 'warehouse']);
        expect(element.querySelector('[data-tile="product"]')?.textContent).toContain('42');
        expect(element.querySelector('[data-tile="category"]')?.textContent).toContain('configuration.analytics.tile.child.subCategory');
    });

    it('puts what needs fixing first, biggest first, and lists what is already fine apart', async () => {
        const { element } = await loaded();

        const open = [...element.querySelectorAll('[data-check]')].map((c) => c.getAttribute('data-check'));
        expect(open).toEqual(['productsWithoutPhoto', 'emptyAisles']);
        expect([...element.querySelectorAll('[data-clear]')].map((c) => c.getAttribute('data-clear'))).toEqual(['emptyCategories']);
    });

    it('says the catalogue is set up well when nothing needs fixing', async () => {
        const { element } = await loaded({ ...DATA, attention: [{ key: 'emptyBrands', total: 0, items: [] }] });

        expect(element.querySelector('[data-analytics="all-clear"]')).not.toBeNull();
        expect(element.querySelectorAll('[data-check]').length).toBe(0);
    });

    it('names a group holding a large share, and folds the smaller ones into Other', async () => {
        const { element } = await loaded();

        expect(element.querySelector('[data-analytics="headline"]')?.textContent).toContain('configuration.analytics.spread.concentrated.category');
        expect(element.querySelector('[data-spread-row="other"]')).not.toBeNull();
    });

    it('says products have no brand rather than naming a brand that does not exist', async () => {
        const { fixture, element } = await loaded();
        fixture.componentInstance.pick('brand');
        fixture.detectChanges();

        expect(element.querySelector('[data-analytics="headline"]')?.textContent).toContain('configuration.analytics.spread.unbranded.brand');
        expect(element.querySelector('[data-spread-row="other"]')).toBeNull();
    });

    it('shows how full a warehouse is, in the danger tone past nine tenths, and asks for a capacity where none is set', async () => {
        const { element } = await loaded();

        const main = element.querySelector('[data-warehouse="Main"]');
        expect(main?.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('95');
        expect(main?.querySelector('[role="meter"]')?.getAttribute('data-tone')).toBe('danger');
        expect(element.querySelector('[data-warehouse="Shop floor"]')?.textContent).toContain('configuration.analytics.warehouses.noCapacity');
    });

    it('leaves out every section the person can open nothing behind, rather than drawing it empty', async () => {
        const { element } = await loaded({ ...DATA, counts: {}, attention: [], spread: {}, warehouses: null });

        expect(element.querySelector('[data-analytics="tiles"]')).toBeNull();
        expect(element.querySelector('[data-analytics="attention"]')).toBeNull();

        expect(element.querySelector('[data-analytics="spread"]')).toBeNull();
        expect(element.querySelector('[data-analytics="warehouses"]')).toBeNull();
    });

    it('offers to try again when the page cannot load', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_CONFIGURATION_ANALYTICS))
            .flush({ code: 500, message: 'boom' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('[role="alert"]')?.textContent).toContain('configuration.analytics.loadFailed.server');
    });
});
