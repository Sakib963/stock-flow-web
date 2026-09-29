import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PurchaseOrderDetails, PurchaseOrderStatus } from '@app/core/models/purchase-order.model';
import { SessionService } from '@app/core/services/session/session.service';
import { PurchaseOrderDetailComponent } from './purchase-order-detail.component';

const ALL = ['view', 'edit', 'approve', 'cancel', 'export'].map((action) => `inventory.purchase-order.${action}`);

const record = (status: PurchaseOrderStatus): PurchaseOrderDetails =>
    ({
        details: { oid: 'po-1', po_number: 'PO-2609-0142', status, purchase_type: 'advance', payment_status: 'unpaid', total_amount: '36000', paid_amount: '0', supplier_name: 'Garment house', supplier_phone: '01711000000', supplier_orders_this_year: 3, special_notes: null, expected_delivery_date: null, created_on: '2026-09-26T11:42:00.000', created_by: 'owner@arithmalabs.test', created_by_name: 'Owner' },
        lines: [],
        stats: { ordered_total: 36000, ordered_units: 80, received_total: null, received_units: null, lines_short: null, units_short: null, price_changed: null, batches: 0, budgets_total: null, warehouses: 1 },
        activity: [],
    }) as unknown as PurchaseOrderDetails;

const open = async (status: PurchaseOrderStatus, permissions = ALL) => {
    await TestBed.configureTestingModule({
        imports: [PurchaseOrderDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'po-1']]) } } }, { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(PurchaseOrderDetailComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_PURCHASE_ORDER_DETAILS))
        .flush({ code: 200, message: 'ok', data: record(status) });
    fixture.detectChanges();
    return fixture.componentInstance;
};

describe('PurchaseOrderDetailComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('offers verify, edit, cancel and payment while the order waits for its delivery', async () => {
        const page = await open('Submitted');
        expect([page.canVerify(), page.canEdit(), page.canCancel(), page.canPay()]).toEqual([true, true, true, true]);
    });

    it('offers only payment once verified, since the order is final', async () => {
        const page = await open('Verified');
        expect([page.canVerify(), page.canEdit(), page.canCancel(), page.canPay()]).toEqual([false, false, false, true]);
    });

    it('offers nothing that changes a cancelled order', async () => {
        const page = await open('Cancelled');
        expect([page.canVerify(), page.canEdit(), page.canCancel(), page.canPay()]).toEqual([false, false, false, false]);
    });

    it('leaves out what someone may not do, rather than greying it out', async () => {
        const page = await open('Submitted', ['inventory.purchase-order.view']);
        expect([page.canVerify(), page.canEdit(), page.canCancel(), page.canPay(), page.canExport()]).toEqual([false, false, false, false, false]);
    });

    it('offers to continue or cancel a draft, but not to verify it or record a payment', async () => {
        const page = await open('Draft');
        expect([page.canVerify(), page.canEdit(), page.canCancel(), page.canPay()]).toEqual([false, true, true, false]);
    });
});
