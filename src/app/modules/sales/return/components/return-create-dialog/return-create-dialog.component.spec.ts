import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OrderDetails } from '@app/core/models/order.model';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { ReturnCreateDialogComponent } from './return-create-dialog.component';

const line = (oid: string, quantity: number) => ({ oid, product_oid: 'p', product_name: `Item ${oid}`, batch_code: 'B-1', quantity, returned_qty: 0, unit_price: 1000, discount: 100, total: 900 * quantity });
const order = { oid: 'order-1', invoice_no: '2610050010', channel: 'ONLINE', delivery_charge: 60, items: [line('a', 2), line('b', 1)] } as unknown as OrderDetails;

const open = async (returnable: Record<string, number> = { a: 2, b: 1 }) => {
    await TestBed.configureTestingModule({
        imports: [ReturnCreateDialogComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReturnCreateDialogComponent);
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('returnable', returnable);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    return { fixture, dialog: fixture.componentInstance, http: TestBed.inject(HttpTestingController) };
};

describe('ReturnCreateDialogComponent', () => {
    it('offers only the lines that still have units out, each up to what is left', async () => {
        const { dialog } = await open({ a: 1, b: 0 });
        expect(dialog.picks().map((pick) => [pick.order_item_oid, pick.returnable])).toEqual([['a', 1]]);
    });

    it('is worth the line price less the per-unit discount, and needs a reason and a unit', async () => {
        const { dialog } = await open();
        expect(dialog.incomplete()).toBe(true);
        dialog.update(0, { quantity: 1 });
        dialog.reason.set('size_or_fit');
        expect(dialog.value()).toBe(900);
        expect(dialog.incomplete()).toBe(false);
    });

    it('offers the delivery charge back only when everything comes back', async () => {
        const { dialog } = await open();
        dialog.update(0, { quantity: 1 });
        expect(dialog.canRefundDelivery()).toBe(false);
        dialog.all();
        dialog.refundDelivery.set(true);
        expect(dialog.value()).toBe(900 * 3 + 60);
    });

    it('asks inside itself, then sends only the picked lines with one id a retry reuses', async () => {
        const { dialog, http } = await open();
        dialog.update(1, { quantity: 1, condition: 'Damaged' });
        dialog.reason.set('damaged_on_arrival');
        dialog.submit();
        expect(dialog.confirming()).toBe(true);
        http.expectNone((r) => r.url.includes(APIEndpoint.CREATE_RETURN));
        dialog.submit();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_RETURN));
        expect(sent.request.body).toEqual(expect.objectContaining({ order_oid: 'order-1', return_reason: 'damaged_on_arrival', refund_delivery_charge: false, items: [{ order_item_oid: 'b', quantity: 1, condition: 'Damaged' }] }));
        const first = sent.request.body.oid;
        sent.flush({ code: 500 }, { status: 500, statusText: 'Server error' });
        dialog.submit();
        dialog.submit();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_RETURN)).request.body.oid).toBe(first);
    });
});
