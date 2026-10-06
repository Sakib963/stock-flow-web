import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Place } from '@app/core/models/customer.model';
import { ChatReading, DeliveryCharges, OnlineDraft, OnlineDraftPayload, OnlineOrderPayload, OnlineOrderResult, OnlineOrderSetup, PhoneLookup } from '@app/core/models/online-order.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

/** Nothing here is cached: a lookup carries a customer's orders, and an order holds stock. */
@Injectable({ providedIn: 'root' })
export class OnlineOrderService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    setup(): Observable<OnlineOrderSetup> {
        return this._http.get<{ data: OnlineOrderSetup }>(`${this._base}${APIEndpoint.GET_ONLINE_ORDER_SETUP}`).pipe(map((response) => response.data));
    }

    /** POSTs, so a customer's phone and message stay out of URLs. */
    findCustomer(phone: string): Observable<PhoneLookup> {
        return this._http.post<{ data: PhoneLookup }>(`${this._base}${APIEndpoint.FIND_CUSTOMER_BY_PHONE}`, { phone }).pipe(map((response) => response.data));
    }

    readMessage(text: string): Observable<ChatReading> {
        return this._http.post<{ data: ChatReading }>(`${this._base}${APIEndpoint.READ_CHAT_MESSAGE}`, { text }).pipe(map((response) => response.data));
    }

    /** Every district at once, for a picker that filters on the page. */
    districts(): Observable<Place[]> {
        return this._http.get<{ data: Place[] }>(`${this._base}${APIEndpoint.SEARCH_LOCATION}`, { params: { level: 'District', limit: 100 } }).pipe(map((response) => response.data));
    }

    saveDraft(payload: OnlineDraftPayload): Observable<{ oid: string; invoice_no: string }> {
        return this._http.post<{ data: { oid: string; invoice_no: string } }>(`${this._base}${APIEndpoint.SAVE_ONLINE_DRAFT}`, payload).pipe(map((response) => response.data));
    }

    drafts(): Observable<OnlineDraft[]> {
        return this._http.get<{ data: OnlineDraft[] }>(`${this._base}${APIEndpoint.GET_ONLINE_DRAFTS}`).pipe(map((response) => response.data));
    }

    discardDraft(oid: string): Observable<unknown> {
        return this._http.post(`${this._base}${APIEndpoint.DISCARD_ONLINE_DRAFT}`, { oid });
    }

    saveDeliveryCharges(charges: DeliveryCharges): Observable<Pick<OnlineOrderSetup, 'home_district' | 'delivery_charge_inside' | 'delivery_charge_outside'>> {
        return this._http.post<{ data: Pick<OnlineOrderSetup, 'home_district' | 'delivery_charge_inside' | 'delivery_charge_outside'> }>(`${this._base}${APIEndpoint.UPDATE_DELIVERY_CHARGES}`, charges).pipe(map((response) => response.data));
    }

    forEdit(oid: string): Observable<OnlineDraft> {
        return this._http.get<{ data: OnlineDraft }>(`${this._base}${APIEndpoint.GET_ONLINE_ORDER_FOR_EDIT}`, { params: { oid } }).pipe(map((response) => response.data));
    }

    /** One write for both: an edit replaces a Pending order's lines and holds under the same oid. */
    create(payload: OnlineOrderPayload, editing = false): Observable<OnlineOrderResult> {
        this.saving.set(true);
        return this._http.post<{ data: OnlineOrderResult }>(`${this._base}${editing ? APIEndpoint.EDIT_ONLINE_ORDER : APIEndpoint.CREATE_ONLINE_ORDER}`, payload).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }
}
