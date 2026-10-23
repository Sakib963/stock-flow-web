import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { ProductDetailComponent } from './product-detail.component';

const DETAILS = {
    code: 200,
    message: 'ok',
    data: {
        details: { oid: 'p-1', category_oid: 'c-1', sub_category_oid: 'sc-1', name: 'Cotton Kurti', sku: 'COTTKUR', photo: null, unit_type: 'pcs', description: null, restock_threshold: 5, status: 'Active', category_name: 'Women', sub_category_name: 'Kurti', brand_name: null, last_action_by: 'owner@arithmalabs.test', last_action_on: '2026-09-20T10:00:00.000' },
        stock: {
            on_hand: 12,
            held: 8,
            sellable: 4,
            booked: 6,
            batches: [{ oid: 'i-1', batch_code: 'B-0917', warehouse_name: 'Main', received_on: '2026-09-17T10:00:00.000', on_hand: 12, held: 8, sellable: 4, cost_price: 450, selling_price: 890 }],
        },
        lifetime: { sold: 31, returned: 2, damaged: 1, given_away: 3, last_sold_on: null },
        recent: { days: 30, units_sold: 10, units_returned: 2, counter_units: 5, online_units: 3, sales: 7120, profit: 3520, units_without_cost: 0 },
        activity: [],
    },
};

const open = async (permissions: string[] = ['configuration.product.view'], recent: Record<string, number> = DETAILS.data.recent) => {
    await TestBed.configureTestingModule({
        imports: [ProductDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'p-1']]) } } }, { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProductDetailComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_PRODUCT_DETAILS))
        .flush({ ...DETAILS, data: { ...DETAILS.data, recent } });
    fixture.detectChanges();
    return fixture;
};

describe('ProductDetailComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('leads with what can be sold now, and flags it as running low against the restock level', async () => {
        const fixture = await open();
        const stats = (fixture.nativeElement as HTMLElement).querySelector('[data-detail="stats"]')?.textContent ?? '';

        expect(fixture.componentInstance.stats()[0]).toEqual(expect.objectContaining({ key: 'sellable', value: 4 }));
        expect(fixture.componentInstance.stockState()).toBe('low');
        expect(stats).toContain('31');
    });

    it('shows units given away apart from units sold', async () => {
        const fixture = await open();
        const stats = fixture.componentInstance.stats();

        expect(stats.find((stat) => stat.key === 'givenAway')?.value).toBe(3);
        expect(stats.find((stat) => stat.key === 'sold')?.value).toBe(31);
    });

    it('shows units on open bookings, which hold nothing, beside what is held for orders', async () => {
        const stats = (await open()).componentInstance.stats();
        expect(stats.find((stat) => stat.key === 'booked')?.value).toBe(6);
        expect(stats.find((stat) => stat.key === 'held')?.value).toBe(8);
    });

    it('shows the last 30 days: units kept, how long the sellable stock lasts at that pace, the share returned and where it sold', async () => {
        const fixture = await open();
        const recent = (fixture.nativeElement as HTMLElement).querySelector('[data-detail="recent"]')?.textContent ?? '';

        expect(fixture.componentInstance.recent()).toEqual(expect.objectContaining({ kept: 8, daysLeft: 15, returnRate: 20 }));
        expect(recent).toContain('5 · 3');
    });

    it('says there were no sales instead of counting days of stock left', async () => {
        const fixture = await open(['configuration.product.view'], { days: 30, units_sold: 0, units_returned: 0, counter_units: 0, online_units: 0 });
        const recent = (fixture.nativeElement as HTMLElement).querySelector('[data-detail="recent"]')?.textContent ?? '';

        expect(fixture.componentInstance.recent()?.daysLeft).toBeNull();
        expect(recent).toContain('configuration.product.recent.noRecentSales');
    });

    it('shows profit and what each batch cost only to someone who may see money', async () => {
        const owner = (await open(['configuration.product.view', 'inventory.stock-value.view'])).nativeElement as HTMLElement;
        expect(owner.querySelector('[data-detail="recent"]')?.textContent).toContain('configuration.product.recent.profit');
        expect(owner.querySelector('[data-detail="batches"]')?.textContent).toContain('configuration.product.batch.cost');
        TestBed.resetTestingModule();

        const staff = (await open()).nativeElement as HTMLElement;
        expect(staff.querySelector('[data-detail="recent"]')?.textContent).not.toContain('configuration.product.recent.profit');
        expect(staff.querySelector('[data-detail="batches"]')?.textContent).not.toContain('configuration.product.batch.cost');
    });

    it('lists each batch with where it is, what is held, and what it cost', async () => {
        const batches = ((await open()).nativeElement as HTMLElement).querySelector('[data-detail="batches"]')?.textContent ?? '';

        expect(batches).toContain('B-0917');
        expect(batches).toContain('Main');
    });

    it('links the category and sub-category for someone who may open them, and names them plainly otherwise', async () => {
        const linked = ((await open(['configuration.product.view', 'configuration.category.view', 'configuration.sub-category.view'])).nativeElement as HTMLElement).querySelectorAll('[data-detail="details"] a');
        expect([...linked].map((a) => a.getAttribute('href'))).toEqual(['/app/configuration/categories/c-1', '/app/configuration/sub-categories/sc-1']);
    });

    it('names the category without a link for someone who cannot open it', async () => {
        const links = ((await open()).nativeElement as HTMLElement).querySelectorAll('[data-detail="details"] a');
        expect(links.length).toBe(0);
    });

    it('leaves Edit and Delete out for someone who may only view', async () => {
        const buttons = [...((await open()).nativeElement as HTMLElement).querySelectorAll('page-header button')].map((b) => b.textContent?.trim());

        expect(buttons).not.toContain('configuration.product.edit');
        expect(buttons).not.toContain('configuration.product.delete');
    });

    it('offers Delete to someone who holds it', async () => {
        const buttons = [...((await open(['configuration.product.view', 'configuration.product.delete'])).nativeElement as HTMLElement).querySelectorAll('page-header button')].map((b) => b.textContent?.trim());

        expect(buttons).toContain('configuration.product.delete');
    });

    it('leaves the stock movements card out for someone who may not see the ledger, and never asks for it', async () => {
        const fixture = await open();
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-detail="movements"]')).toBeNull();
        TestBed.inject(HttpTestingController).expectNone((r) => r.url.includes(APIEndpoint.GET_STOCK_MOVEMENT_LIST));
    });

    it("shows this product's latest movements, newest first, each signed, its document opening where the person may go", async () => {
        const fixture = await open(['configuration.product.view', 'inventory.stock-movement.view', 'inventory.purchase-order.view']);
        const request = TestBed.inject(HttpTestingController).expectOne((r) => r.url.includes(APIEndpoint.GET_STOCK_MOVEMENT_LIST));
        expect(request.request.params.get('product_oid')).toBe('p-1');
        request.flush({
            data: {
                rows: [
                    { oid: 'm-2', created_on: '2026-10-03T10:00:00.000', reason: 'sold', quantity: -2, balance_after: 74, batch_code: 'B-7KQ4-M2XH', reference: 'INV-1203', reference_kind: 'order', reference_oid: 'o-1' },
                    { oid: 'm-1', created_on: '2026-10-02T10:00:00.000', reason: 'received', quantity: 76, balance_after: 76, batch_code: 'B-7KQ4-M2XH', reference: 'PO-2609-0142', reference_kind: 'purchase-order', reference_oid: 'po-1' },
                ],
            },
        });
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const card = (fixture.nativeElement as HTMLElement).querySelector('[data-detail="movements"]')!;
        const rows = [...card.querySelectorAll('tbody tr:not([nz-table-measure-row])')].map((row) => row.textContent?.replace(/\s+/g, ' ').trim());
        expect(rows[0]).toContain('-2');
        expect(rows[1]).toContain('+76');
        expect(card.querySelector('a[href*="purchase-orders/po-1"]')?.textContent?.trim()).toBe('PO-2609-0142');
        expect(card.querySelector('a[href*="orders/o-1"]')).toBeNull();
        expect(rows[0]).toContain('INV-1203');
    });

    it('says the movements could not be loaded and offers to try again, without losing the rest of the page', async () => {
        const fixture = await open(['configuration.product.view', 'inventory.stock-movement.view']);
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_STOCK_MOVEMENT_LIST))
            .flush('down', { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        expect(fixture.componentInstance.movementsFailed()).toBe('server');
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-detail="movements"] [role="alert"]')).not.toBeNull();
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-detail="batches"]')).not.toBeNull();
    });
});
