import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { BatchOrder } from '@app/core/models/delivery-batch.model';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { DeliveryBatchCreateComponent } from './delivery-batch-create.component';

const ready = (oid: string, to_collect: number): Partial<BatchOrder> => ({ oid, invoice_no: `INV-${oid}`, status: 'Confirmed', created_on: '2026-10-11T10:00:00.000', delivery_status: 'Packed', recipient_name: 'Person A', recipient_phone: '01711000111', district: 'Dhaka', thana: 'Mohammadpur', units: 1, to_collect, ready: true });

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [DeliveryBatchCreateComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(DeliveryBatchCreateComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http, element: fixture.nativeElement as HTMLElement };
};

describe('DeliveryBatchCreateComponent', () => {
    it('ticks every order ready to send, and makes the batch with the ones left ticked after asking', async () => {
        const { fixture, page, http, element } = await open();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_ORDERS_READY_TO_SEND)).flush({ code: 200, data: [ready('a', 1500), ready('b', 900), ready('c', 0)] });
        fixture.detectChanges();
        expect(page.chosen().length).toBe(3);
        expect(page.toCollect()).toBe(2400);
        expect(element.querySelectorAll('[data-order]').length).toBe(3);

        page.tick('b', false);
        expect(page.toCollect()).toBe(1500);
        vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
        page.save();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_DELIVERY_BATCH));
        expect(sent.request.body).toEqual(expect.objectContaining({ courier: 'Pathao', note: null, order_oids: ['a', 'c'] }));
    });

    it('says so when nothing is ready to send', async () => {
        const { fixture, http, element } = await open();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_ORDERS_READY_TO_SEND)).flush({ code: 200, data: [] });
        fixture.detectChanges();
        expect(element.querySelector('[data-batch="none-ready"]')).not.toBeNull();
        expect(element.querySelector<HTMLButtonElement>('[data-batch="save"]')!.disabled).toBe(true);
    });
});
