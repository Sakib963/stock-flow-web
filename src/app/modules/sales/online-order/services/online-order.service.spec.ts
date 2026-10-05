import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OnlineOrderService } from './online-order.service';

describe('OnlineOrderService', () => {
    const setup = () => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        return { service: TestBed.inject(OnlineOrderService), http: TestBed.inject(HttpTestingController) };
    };

    it('keeps a phone and a pasted message out of the URL', () => {
        const { service, http } = setup();
        service.findCustomer('01987654321').subscribe();
        service.readMessage('person a, 01987654321').subscribe();
        const lookup = http.expectOne((r) => r.url.endsWith(APIEndpoint.FIND_CUSTOMER_BY_PHONE));
        const read = http.expectOne((r) => r.url.endsWith(APIEndpoint.READ_CHAT_MESSAGE));
        expect([lookup.request.method, read.request.method]).toEqual(['POST', 'POST']);
        expect(lookup.request.urlWithParams).not.toContain('0198');
    });

    it('says it is saving while an order is being created, and stops when it fails', () => {
        const { service, http } = setup();
        service.create({} as never).subscribe({ error: () => undefined });
        expect(service.saving()).toBe(true);
        http.expectOne((r) => r.url.endsWith(APIEndpoint.CREATE_ONLINE_ORDER)).flush({}, { status: 500, statusText: 'Server Error' });
        expect(service.saving()).toBe(false);
    });
});
