import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CancelReason, ConfirmedVia, Courier, NotDeliveredReason, OrderDetails, OrderScope, RefundMethod } from '@app/core/models/order.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrderService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    /** Never cached: an order carries stock, holds and money that another person may move at any moment. */
    details(oid: string, scope: OrderScope = 'all'): Observable<OrderDetails> {
        return this._http.get<{ data: OrderDetails }>(`${this._base}${scope === 'history' ? APIEndpoint.GET_ORDER_HISTORY_DETAILS : APIEndpoint.GET_ORDER_DETAILS}`, { params: { oid } }).pipe(map((response) => response.data));
    }

    confirm(oid: string, confirmed_via: ConfirmedVia, note: string | null, scope: OrderScope = 'all'): Observable<unknown> {
        return this.write(scope === 'history' ? APIEndpoint.CONFIRM_ORDER_HISTORY : APIEndpoint.CONFIRM_ORDER, { oid, confirmed_via, note });
    }

    cancel(oid: string, reason_code: CancelReason, note: string | null, scope: OrderScope = 'all'): Observable<{ refund_due: number }> {
        return this.write<{ refund_due: number }>(scope === 'history' ? APIEndpoint.CANCEL_ORDER_HISTORY : APIEndpoint.CANCEL_ORDER, { oid, reason_code, note });
    }

    markPacked(oid: string): Observable<unknown> {
        return this.write(APIEndpoint.MARK_ORDER_PACKED, { oid });
    }

    dispatch(oid: string, courier: Courier, consignment_no: string | null): Observable<unknown> {
        return this.write(APIEndpoint.DISPATCH_ORDER, { oid, courier, consignment_no });
    }

    deliver(oid: string): Observable<unknown> {
        return this.write(APIEndpoint.DELIVER_ORDER, { oid });
    }

    notDelivered(oid: string, reason: NotDeliveredReason, note: string | null): Observable<unknown> {
        return this.write(APIEndpoint.MARK_ORDER_NOT_DELIVERED, { oid, reason, note });
    }

    recordRefund(oid: string, amount: number, method: RefundMethod, note: string | null): Observable<unknown> {
        return this.write(APIEndpoint.RECORD_ORDER_REFUND, { oid, amount, method, note });
    }

    private write<T = unknown>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }
}
