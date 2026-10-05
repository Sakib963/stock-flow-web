import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CheckoutPayload, CustomerLookup, ParkPayload, ParkedCart, SaleResult } from '@app/core/models/pos.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

/** Nothing here is cached: every answer carries stock that another counter may have sold a moment ago. */
@Injectable({ providedIn: 'root' })
export class PosService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    parkedCarts(): Observable<ParkedCart[]> {
        return this._http.get<{ data: ParkedCart[] }>(`${this._base}${APIEndpoint.GET_PARKED_CARTS}`).pipe(map((response) => response.data));
    }

    /** A POST so the phone stays out of the URL. */
    findCustomer(phone: string): Observable<CustomerLookup> {
        return this._http.post<{ data: CustomerLookup }>(`${this._base}${APIEndpoint.FIND_CUSTOMER_BY_PHONE}`, { phone }).pipe(map((response) => response.data));
    }

    checkout(payload: CheckoutPayload): Observable<SaleResult> {
        return this.write<SaleResult>(APIEndpoint.CHECKOUT_POS_SALE, payload);
    }

    park(payload: ParkPayload): Observable<{ oid: string; invoice_no: string }> {
        return this.write<{ oid: string; invoice_no: string }>(APIEndpoint.PARK_POS_CART, payload);
    }

    discard(oid: string): Observable<void> {
        return this.write<unknown>(APIEndpoint.DISCARD_PARKED_CART, { oid }).pipe(map(() => undefined));
    }

    private write<T>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response?.data),
            finalize(() => this.saving.set(false))
        );
    }
}
