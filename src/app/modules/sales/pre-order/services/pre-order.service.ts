import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ChatReading, PhoneLookup } from '@app/core/models/online-order.model';
import { ConversionBooking, OpenBookingLine, PreOrderCancelReason, PreOrderDetails, PreOrderPayload, PreOrderProduct } from '@app/core/models/pre-order.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PreOrderService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    /** Never cached: each line's sellable now is live stock. */
    details(oid: string): Observable<PreOrderDetails> {
        return this._http.get<{ data: PreOrderDetails }>(`${this._base}${APIEndpoint.GET_PRE_ORDER_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    /** A booking opened to become an online order, with its products' batches. Never cached: it carries stock. */
    forConversion(oid: string): Observable<ConversionBooking> {
        return this._http.get<{ data: ConversionBooking }>(`${this._base}${APIEndpoint.GET_PRE_ORDER_FOR_CONVERSION}/${oid}`).pipe(map((response) => response.data));
    }

    /** POSTs, so a customer's phone stays out of URLs. */
    findCustomer(phone: string): Observable<PhoneLookup> {
        return this._http.post<{ data: PhoneLookup }>(`${this._base}${APIEndpoint.FIND_CUSTOMER_BY_PHONE}`, { phone }).pipe(map((response) => response.data));
    }

    /** The open bookings this phone already has. */
    openBookings(phone: string): Observable<OpenBookingLine[]> {
        return this._http.post<{ data: OpenBookingLine[] }>(`${this._base}${APIEndpoint.FIND_OPEN_BOOKINGS}`, { phone }).pipe(map((response) => response.data));
    }

    /** The online order's chat reader: the phone and name a pasted message holds. */
    readMessage(text: string): Observable<ChatReading> {
        return this._http.post<{ data: ChatReading }>(`${this._base}${APIEndpoint.READ_CHAT_MESSAGE}`, { text }).pipe(map((response) => response.data));
    }

    products(search: string): Observable<PreOrderProduct[]> {
        return this._http.get<{ data: PreOrderProduct[] }>(`${this._base}${APIEndpoint.GET_PRODUCT_LIST_FOR_PRE_ORDER}`, { params: { search } }).pipe(map((response) => response.data));
    }

    create(body: PreOrderPayload): Observable<{ oid: string; preorder_no: string }> {
        return this.write(APIEndpoint.CREATE_PRE_ORDER, body);
    }

    update(body: PreOrderPayload): Observable<{ oid: string; changed: boolean }> {
        return this.write(APIEndpoint.UPDATE_PRE_ORDER, body);
    }

    confirm(oid: string): Observable<unknown> {
        return this.write(APIEndpoint.CONFIRM_PRE_ORDER, { oid });
    }

    cancel(body: { oid: string; reason: PreOrderCancelReason; note: string | null; refund_due: number }): Observable<unknown> {
        return this.write(APIEndpoint.CANCEL_PRE_ORDER, body);
    }

    recordRefund(oid: string): Observable<unknown> {
        return this.write(APIEndpoint.RECORD_PRE_ORDER_REFUND, { oid });
    }

    private write<T = unknown>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }
}
