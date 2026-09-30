import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PurchaseOrderLine } from '@app/core/models/purchase-order.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { PurchaseOrderVerifyComponent } from './purchase-order-verify.component';

const line = (oid: string, selling: string | null): PurchaseOrderLine => ({ oid, product_name: oid, ordered_quantity: 10, ordered_unit_price: '100', current_selling_price: selling, current_maximum_discount: selling ? '10' : null, batches: [] }) as unknown as PurchaseOrderLine;

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [PurchaseOrderVerifyComponent],
        providers: [...OVERLAY_PROVIDERS, provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'po-1']]) } } }, { provide: SessionService, useValue: { can: () => true, menu: () => [] } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(PurchaseOrderVerifyComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_PURCHASE_ORDER_DETAILS))
        .flush({ code: 200, message: 'ok', data: { details: { oid: 'po-1', po_number: 'PO-2609-0142', status: 'Submitted' }, lines: [line('l-1', '180'), line('l-2', null)], stats: { ordered_total: 2000 }, activity: [] } });
    fixture.detectChanges();
    return fixture.componentInstance;
};

const click = { stopPropagation: () => undefined } as Event;

describe('PurchaseOrderVerifyComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('keeps Verify off until every line is checked', async () => {
        const page = await open();
        const [priced, unpriced] = page.lines();

        page.arrived(priced, click);
        expect(page.checked()).toBe(1);
        expect(page.ready()).toBe(false);

        // A product never priced cannot be ticked: it opens the drawer for a price instead.
        page.arrived(unpriced, click);
        expect(page.editing()?.oid).toBe('l-2');
        expect(page.ready()).toBe(false);

        page.saved({ next: false, value: { oid: 'l-2', received_quantity: 8, unit_price: 100, intended_use: 'internal_use', ad_run_cost: null, packaging_cost: null, gift_cost: null, content_creation_cost: null, influencer_cost: null, cost_remarks: null } });
        expect(page.ready()).toBe(true);
        expect(page.unitsShort()).toBe(2);
        expect(page.receivedTotal()).toBe(1800);
    });

    it('marks a checked line as differing when it came short or at another price, and as ordered otherwise', async () => {
        const page = await open();
        const [priced, unpriced] = page.lines();

        page.arrived(priced, click);
        expect(page.differs(priced)).toBe(false);

        page.saved({ next: false, value: { oid: 'l-2', received_quantity: 10, unit_price: 120, intended_use: 'internal_use', ad_run_cost: null, packaging_cost: null, gift_cost: null, content_creation_cost: null, influencer_cost: null, cost_remarks: null } });
        expect(page.differs(unpriced)).toBe(true);
    });

    it('names the order in the confirmation title, not a placeholder', async () => {
        const page = await open();
        for (const line of page.lines()) page.saved({ next: false, value: { oid: line.oid, received_quantity: 10, unit_price: 100, intended_use: 'internal_use', ad_run_cost: null, packaging_cost: null, gift_cost: null, content_creation_cost: null, influencer_cost: null, cost_remarks: null } });

        const instant = vi.spyOn(TestBed.inject(TranslateService), 'instant');
        page.verify();
        expect(instant).toHaveBeenCalledWith('inventory.purchaseOrder.confirmVerify.title', { number: 'PO-2609-0142' });
    });
});
