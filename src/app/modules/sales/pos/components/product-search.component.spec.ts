import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PosBatch } from '@app/core/models/pos.model';
import { ProductSearchComponent } from './product-search.component';

const row = (batch_code: string, sku = 'KURTI-38'): PosBatch => ({ product_oid: 'p-1', product_name: 'Floral print kurti', image_url: null, sku, inventory_oid: `i-${batch_code}`, batch_code, expiry_date: null, quantity_available: 5, sellable_quantity: 5, selling_price: 1450, maximum_discount: 0 });

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [ProductSearchComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProductSearchComponent);
    fixture.detectChanges();
    const picked: PosBatch[] = [];
    fixture.componentInstance.picked.subscribe((batch) => picked.push(batch));
    return { search: fixture.componentInstance, http: TestBed.inject(HttpTestingController), picked };
};

const scan = (search: ProductSearchComponent, code: string) => {
    search.typed(code);
    search.enter(new KeyboardEvent('keydown', { key: 'Enter' }));
};

describe('ProductSearchComponent', () => {
    it('puts a scanned batch code straight in the cart, without waiting for the typing pause', async () => {
        const { search, http, picked } = await open();
        scan(search, 'b-7kq2-91x');
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_POS_PRODUCT_LIST)).flush({ code: 200, data: [row('B-7KQ2-91X'), row('B-7KQ2-91XA')] });
        expect(picked.map((b) => b.batch_code)).toEqual(['B-7KQ2-91X']);
        expect(search.text()).toBe('');
    });

    it('lists the batches of a scanned SKU with several, for the person to pick one', async () => {
        const { search, http, picked } = await open();
        scan(search, 'KURTI-38');
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_POS_PRODUCT_LIST)).flush({ code: 200, data: [row('B-1'), row('B-2')] });
        expect(picked).toEqual([]);
        expect(search.groups()[0].batches.length).toBe(2);
    });

    it('takes a SKU with one batch at once', async () => {
        const { search, http, picked } = await open();
        scan(search, 'scarf-01');
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_POS_PRODUCT_LIST)).flush({ code: 200, data: [row('B-9', 'SCARF-01')] });
        expect(picked.map((b) => b.batch_code)).toEqual(['B-9']);
    });
});
