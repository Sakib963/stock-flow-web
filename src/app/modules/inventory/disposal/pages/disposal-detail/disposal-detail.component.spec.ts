import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { DisposalStatus, DisposalRecord } from '@app/core/models/disposal.model';
import { DisposalService } from '@app/modules/inventory/disposal/services/disposal.service';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { DisposalDetailComponent } from './disposal-detail.component';

const ALL = ['view', 'edit', 'approve', 'reject', 'cancel', 'export'].map((action) => `inventory.product-dispose.${action}`);

const record = (status: DisposalStatus, sees_money = true): DisposalRecord => ({
    details: {
        oid: 'a-1', dispose_no: 'DSP-2610-0001', disposal_date: '2026-10-01', method: 'destroyed', status, note: null, created_on: '2026-09-30T10:00:00.000', created_by: 'owner@arithmalabs.test', created_by_name: 'Owner',
        line_count: 1, units: 2, ...(sees_money ? { value: 600 } : {}),
        reject_reason: null, cancel_reason: null, submitted_on: null, submitted_by: null, submitted_by_name: null, approved_on: null, approved_by: null, approved_by_name: null,
        rejected_on: null, rejected_by: null, rejected_by_name: null, cancelled_on: null, cancelled_by: null, cancelled_by_name: null,
    },
    lines: [{ oid: 'l-1', product_oid: 'p-1', product_name: 'Sun cream', sku: 'SUN', unit_type: 'pcs', inventory_oid: 'i-1', batch_code: 'B-7KQ4-M2XH', quantity: 2, reason: 'damaged', line_note: null, on_hand: 10, free: 8, expiry_date: null, warehouse_name: 'Main', ...(sees_money ? { cost_price: '300', value: '600' } : {}) }],
    activity: [],
    sees_money,
});

const open = async (data: DisposalRecord, permissions: string[]) => {
    await TestBed.configureTestingModule({
        imports: [DisposalDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'a-1']]) } } }, { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(DisposalDetailComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_DISPOSAL_DETAILS))
        .flush({ code: 200, data });
    fixture.detectChanges();
    return fixture;
};

describe('DisposalDetailComponent', () => {
    it('offers Approve and Reject only on a Submitted disposal, to those allowed', async () => {
        const page = (await open(record('Submitted'), ALL)).componentInstance;
        expect([page.canApprove(), page.canReject(), page.canEdit(), page.canCancel()]).toEqual([true, true, true, true]);
        TestBed.resetTestingModule();
        const viewer = (await open(record('Submitted'), ['inventory.product-dispose.view'])).componentInstance;
        expect([viewer.canApprove(), viewer.canReject(), viewer.canEdit(), viewer.canCancel()]).toEqual([false, false, false, false]);
    });

    it('cannot approve a draft, and a approved one is final', async () => {
        const draft = (await open(record('Draft'), ALL)).componentInstance;
        expect([draft.canApprove(), draft.canReject(), draft.canEdit()]).toEqual([false, false, true]);
        TestBed.resetTestingModule();
        const approved = (await open(record('Approved'), ALL)).componentInstance;
        expect([approved.canApprove(), approved.canReject(), approved.canEdit(), approved.canCancel()]).toEqual([false, false, false, false]);
    });

    it('draws no value for someone the server sent none to', async () => {
        const fixture = await open(record('Submitted', false), ALL);
        const page = fixture.nativeElement as HTMLElement;
        expect(page.querySelector('[data-stat="value"]')).toBeNull();
        expect(page.querySelector('[data-stat="units"]')).not.toBeNull();
    });

    it('locks every action while a approve is on its way, not just Approve', async () => {
        const fixture = await open(record('Submitted'), ALL);
        TestBed.inject(DisposalService).saving.set(true);
        fixture.detectChanges();
        const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('page-header button:not([data-page-header="back"])')];
        expect(buttons.length).toBe(4);
        expect(buttons.every((button) => button.disabled)).toBe(true);
        fixture.componentInstance.openClosing('cancel');
        expect(fixture.componentInstance.closing()).toBeNull();
    });
});
