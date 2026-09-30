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
            batches: [{ oid: 'i-1', batch_code: 'B-0917', warehouse_name: 'Main', received_on: '2026-09-17T10:00:00.000', on_hand: 12, held: 8, sellable: 4, cost_price: 450, selling_price: 890 }],
        },
        lifetime: { sold: 31, returned: 2, damaged: 1, last_sold_on: null },
        activity: [],
    },
};

const open = async (permissions: string[] = ['configuration.product.view']) => {
    await TestBed.configureTestingModule({
        imports: [ProductDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'p-1']]) } } }, { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProductDetailComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_PRODUCT_DETAILS))
        .flush(DETAILS);
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

    it("shows this product's latest movements, newest first, each signed and with its document", async () => {
        const fixture = await open(['configuration.product.view', 'inventory.stock-movement.view']);
        const request = TestBed.inject(HttpTestingController).expectOne((r) => r.url.includes(APIEndpoint.GET_STOCK_MOVEMENT_LIST));
        expect(request.request.params.get('product_oid')).toBe('p-1');
        request.flush({
            data: {
                rows: [
                    { oid: 'm-2', created_on: '2026-10-03T10:00:00.000', reason: 'sold', quantity: -2, balance_after: 74, batch_code: 'B-7KQ4-M2XH', reference: 'INV-1203', purchase_oid: null },
                    { oid: 'm-1', created_on: '2026-10-02T10:00:00.000', reason: 'received', quantity: 76, balance_after: 76, batch_code: 'B-7KQ4-M2XH', reference: 'PO-2609-0142', purchase_oid: 'po-1' },
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
