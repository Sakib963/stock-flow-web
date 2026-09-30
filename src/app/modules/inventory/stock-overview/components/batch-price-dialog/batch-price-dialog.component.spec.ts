import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { StockBatch } from '@app/core/models/stock-overview.model';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { BatchPriceDialogComponent } from './batch-price-dialog.component';

const BATCH = { oid: 'i-1', batch_code: 'B-7KQ4-M2XH', intended_use: 'for_sale', status: 'ready_for_sale', selling_price: 500, maximum_discount: 50, cost_price: 300, budget_per_unit: 20 } as StockBatch;

const open = async (batch: StockBatch = BATCH) => {
    await TestBed.configureTestingModule({
        imports: [BatchPriceDialogComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(BatchPriceDialogComponent);
    fixture.componentRef.setInput('batch', batch);
    fixture.detectChanges();
    return fixture.componentInstance;
};

describe('BatchPriceDialogComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('asks in the same dialog first, and sends the price only once confirmed', async () => {
        const dialog = await open();
        dialog.form.setValue({ selling_price: 550, maximum_discount: 30 });
        dialog.review();
        expect(dialog.confirming()).toBe(true);
        TestBed.inject(HttpTestingController).expectNone((r) => r.url.includes(APIEndpoint.UPDATE_BATCH_PRICING));

        dialog.save();
        const request = TestBed.inject(HttpTestingController).expectOne((r) => r.url.includes(APIEndpoint.UPDATE_BATCH_PRICING));
        expect(request.request.body).toEqual({ inventory_oid: 'i-1', selling_price: 550, maximum_discount: 30 });
        request.flush({ code: 200, data: { changed: true } });
    });

    it('shows what a unit leaves after cost and budget as the price is typed', async () => {
        const dialog = await open();
        dialog.form.controls.selling_price.setValue(600);
        expect(dialog.margin()).toBe(280);
    });

    it('will not go on with a discount above the price', async () => {
        const dialog = await open();
        dialog.form.setValue({ selling_price: 100, maximum_discount: 150 });
        dialog.review();
        expect(dialog.confirming()).toBe(false);
    });

    it('fills in the current price and discount when the server sends them as text, and knows they are unchanged', async () => {
        const dialog = await open({ ...BATCH, selling_price: '1250.00', maximum_discount: '100.00' } as unknown as StockBatch);
        expect(dialog.form.getRawValue()).toEqual({ selling_price: 1250, maximum_discount: 100 });
        const closed: boolean[] = [];
        dialog.closed.subscribe(() => closed.push(true));
        dialog.review();
        expect(closed).toEqual([true]);
    });

    it('closes without asking when the price is unchanged', async () => {
        const dialog = await open();
        const closed: boolean[] = [];
        dialog.closed.subscribe(() => closed.push(true));
        dialog.review();
        expect(dialog.confirming()).toBe(false);
        expect(closed).toEqual([true]);
    });
});
