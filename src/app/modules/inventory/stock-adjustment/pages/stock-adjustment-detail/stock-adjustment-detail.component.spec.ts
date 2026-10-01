import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { AdjustmentStatus, StockAdjustmentRecord } from '@app/core/models/stock-adjustment.model';
import { StockAdjustmentService } from '@app/modules/inventory/stock-adjustment/services/stock-adjustment.service';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { StockAdjustmentDetailComponent } from './stock-adjustment-detail.component';

const ALL = ['view', 'edit', 'approve', 'reject', 'cancel', 'export'].map((action) => `inventory.stock-adjustment.${action}`);

const record = (status: AdjustmentStatus, sees_money = true): StockAdjustmentRecord => ({
    details: {
        oid: 'a-1', adjustment_number: 'ADJ-2609-0001', reason: 'theft', status, note: null, created_on: '2026-09-30T10:00:00.000', created_by: 'owner@arithmalabs.test', created_by_name: 'Owner',
        line_count: 1, units_in: 0, units_out: 2, ...(sees_money ? { value_in: 0, value_out: 600 } : {}),
        reject_reason: null, cancel_reason: null, submitted_on: null, submitted_by: null, submitted_by_name: null, verified_on: null, verified_by: null, verified_by_name: null,
        rejected_on: null, rejected_by: null, rejected_by_name: null, cancelled_on: null, cancelled_by: null, cancelled_by_name: null,
    },
    lines: [{ oid: 'l-1', product_oid: 'p-1', product_name: 'Sun cream', sku: 'SUN', has_expiry: false, unit_type: 'pcs', direction: 'out', quantity: 2, inventory_oid: 'i-1', batch_code: 'B-7KQ4-M2XH', on_hand: 10, free: 8, ...(sees_money ? { cost_price: '300', value: '600' } : {}), intended_use: null, selling_price: null, maximum_discount: null, warehouse_oid: 'w-1', warehouse_name: 'Main', aisle_oid: null, aisle_name: null, expiry_date: null }],
    activity: [],
    sees_money,
});

const open = async (data: StockAdjustmentRecord, permissions: string[]) => {
    await TestBed.configureTestingModule({
        imports: [StockAdjustmentDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'a-1']]) } } }, { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(StockAdjustmentDetailComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_STOCK_ADJUSTMENT_DETAILS))
        .flush({ code: 200, data });
    fixture.detectChanges();
    return fixture;
};

describe('StockAdjustmentDetailComponent', () => {
    it('offers Verify and Reject only on a Submitted adjustment, to those allowed', async () => {
        const page = (await open(record('Submitted'), ALL)).componentInstance;
        expect([page.canVerify(), page.canReject(), page.canEdit(), page.canCancel()]).toEqual([true, true, true, true]);
        TestBed.resetTestingModule();
        const viewer = (await open(record('Submitted'), ['inventory.stock-adjustment.view'])).componentInstance;
        expect([viewer.canVerify(), viewer.canReject(), viewer.canEdit(), viewer.canCancel()]).toEqual([false, false, false, false]);
    });

    it('cannot verify a draft, and a verified one is final', async () => {
        const draft = (await open(record('Draft'), ALL)).componentInstance;
        expect([draft.canVerify(), draft.canReject(), draft.canEdit()]).toEqual([false, false, true]);
        TestBed.resetTestingModule();
        const verified = (await open(record('Verified'), ALL)).componentInstance;
        expect([verified.canVerify(), verified.canReject(), verified.canEdit(), verified.canCancel()]).toEqual([false, false, false, false]);
    });

    it('draws no value for someone the server sent none to', async () => {
        const fixture = await open(record('Submitted', false), ALL);
        const page = fixture.nativeElement as HTMLElement;
        expect(page.querySelector('[data-stat="value-out"]')).toBeNull();
        expect(page.querySelector('[data-stat="out"]')).not.toBeNull();
    });

    it('locks every action while a verify is on its way, not just Verify', async () => {
        const fixture = await open(record('Submitted'), ALL);
        TestBed.inject(StockAdjustmentService).saving.set(true);
        fixture.detectChanges();
        const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('page-header button:not([data-page-header="back"])')];
        expect(buttons.length).toBe(4);
        expect(buttons.every((button) => button.disabled)).toBe(true);
        fixture.componentInstance.openClosing('cancel');
        expect(fixture.componentInstance.closing()).toBeNull();
    });
});
