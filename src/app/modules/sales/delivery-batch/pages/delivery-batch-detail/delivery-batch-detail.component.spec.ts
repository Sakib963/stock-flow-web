import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { BatchOrder, DeliveryBatchDetails } from '@app/core/models/delivery-batch.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { DeliveryBatchDetailComponent } from './delivery-batch-detail.component';

const OID = '6a1d4c5b-0f3b-4c8e-9b77-3e2a1d7c2e5a';
const ALL = ['sales.delivery-batch.view', 'sales.delivery-batch.edit', 'sales.delivery-batch.dispatch', 'sales.delivery-batch.deliver', 'sales.delivery-batch.cancel'];

const order = (oid: string, over: Partial<BatchOrder> = {}): BatchOrder => ({
    oid,
    invoice_no: `26101100${oid}`,
    status: 'Confirmed',
    created_on: '2026-10-11T10:00:00.000',
    notes: null,
    tracking_token: null,
    dispatched_on: null,
    delivery_status: 'Packed',
    courier: null,
    consignment_no: null,
    recipient_name: 'Person A',
    recipient_phone: '01711000111',
    address_line: 'House 5',
    area_text: null,
    postal_code: '1207',
    district: 'Dhaka',
    thana: 'Mohammadpur',
    units: 2,
    items: 'Glow serum x2',
    to_collect: 2960,
    ready: true,
    ...over,
});

const batch = (over: Partial<DeliveryBatchDetails> = {}): DeliveryBatchDetails => ({
    oid: OID,
    batch_no: 'DB-2610-0001',
    courier: 'Pathao',
    status: 'Open',
    note: null,
    cancel_note: null,
    created_on: '2026-10-11T10:00:00.000',
    created_by: 'Owner',
    handed_over_on: null,
    handed_over_by: null,
    cancelled_on: null,
    orders: [order('1'), order('2')],
    activity: [],
    ...over,
});

const open = async (details: DeliveryBatchDetails, granted = ALL) => {
    await TestBed.configureTestingModule({
        imports: [DeliveryBatchDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ oid: OID }), data: {} } } }, { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), menu: () => [], business: () => null, user: () => ({ name: 'Owner' }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(DeliveryBatchDetailComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_DELIVERY_BATCH_DETAILS)).flush({ code: 200, data: details });
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, element: fixture.nativeElement as HTMLElement };
};

const quick = (element: HTMLElement) => [...element.querySelectorAll('[data-quick]')].map((node) => node.getAttribute('data-quick'));

describe('DeliveryBatchDetailComponent', () => {
    it('offers each action only in the state and to the person it belongs to', async () => {
        expect(quick((await open(batch())).element)).toEqual(['hand-over', 'file', 'labels-all', 'labels-ticked', 'add', 'take-out', 'cancel']);
        TestBed.resetTestingModule();
        expect(quick((await open(batch({ status: 'HandedOver' }))).element)).toEqual(['deliver', 'file', 'labels-all', 'labels-ticked']);
        TestBed.resetTestingModule();
        expect(quick((await open(batch({ status: 'Cancelled' }))).element)).toEqual(['none']);
        TestBed.resetTestingModule();
        expect(quick((await open(batch(), ['sales.delivery-batch.view'])).element)).toEqual(['labels-all', 'labels-ticked']);
    });

    it('marks delivered only the ticked orders still with the courier, after asking', async () => {
        const { fixture, page, http } = await open(batch({ status: 'HandedOver', orders: [order('1', { delivery_status: 'WithCourier' }), order('2', { delivery_status: 'WithCourier' }), order('3', { status: 'Delivered', delivery_status: 'Delivered' })] }));
        vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
        page.tickAll(true);
        expect(page.withCourier().map((o) => o.oid)).toEqual(['1', '2']);
        page.deliver();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.DELIVER_DELIVERY_BATCH));
        expect(sent.request.body).toEqual({ oid: OID, order_oids: ['1', '2'] });
    });

    it('takes the ticked orders out by sending the ones that stay, and never empties the batch', async () => {
        const { fixture, page, http } = await open(batch());
        vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
        page.tick('1', true);
        page.takeOut();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.UPDATE_DELIVERY_BATCH_ORDERS)).request.body).toEqual({ oid: OID, order_oids: ['2'] });
        page.tickAll(true);
        page.takeOut();
        http.expectNone((r) => r.url.includes(APIEndpoint.UPDATE_DELIVERY_BATCH_ORDERS));
    });

    it('labels only parcels still on their way out', async () => {
        const { page } = await open(batch({ orders: [order('1'), order('2', { status: 'Cancelled' }), order('3', { status: 'Delivered', delivery_status: 'Delivered' })] }));
        expect(page.printable().map((o) => o.oid)).toEqual(['1']);
    });
});
