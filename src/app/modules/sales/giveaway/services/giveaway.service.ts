import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { AddOrderGift, CreateGiveaway, GiveawayDetails, OrderGift } from '@app/core/models/giveaway.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GiveawayService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    /** Never cached: a giveaway moves stock. */
    details(oid: string): Observable<GiveawayDetails> {
        return this._http.get<{ data: GiveawayDetails }>(`${this._base}${APIEndpoint.GET_GIVEAWAY_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    create(body: CreateGiveaway): Observable<{ oid: string; giveaway_no: string }> {
        return this.write(APIEndpoint.CREATE_GIVEAWAY, body);
    }

    give(oid: string): Observable<unknown> {
        return this.write(APIEndpoint.GIVE_GIVEAWAY, { oid });
    }

    /** The gifts in an order's parcel. */
    forOrder(order_oid: string): Observable<OrderGift[]> {
        return this._http.get<{ data: { rows: OrderGift[] } }>(`${this._base}${APIEndpoint.GET_GIVEAWAY_LIST}`, { params: { order_oid, limit: 100 } }).pipe(map((response) => response.data.rows));
    }

    addToOrder(body: AddOrderGift): Observable<{ oid: string; giveaway_no: string }> {
        return this.write(APIEndpoint.ADD_ORDER_GIFT, body);
    }

    removeFromOrder(oid: string): Observable<unknown> {
        return this.write(APIEndpoint.REMOVE_ORDER_GIFT, { oid });
    }

    cancel(oid: string, reason: string): Observable<unknown> {
        return this.write(APIEndpoint.CANCEL_GIVEAWAY, { oid, reason });
    }

    private write<T = unknown>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }
}
