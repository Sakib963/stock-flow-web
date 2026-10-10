import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ConfirmReturn, CreateReturn, CreatedReturn, OrderReturns, ReturnDetails } from '@app/core/models/return.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReturnService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    /** Never cached: a return moves stock and money. */
    details(oid: string): Observable<ReturnDetails> {
        return this._http.get<{ data: ReturnDetails }>(`${this._base}${APIEndpoint.GET_RETURN_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    forOrder(order_oid: string): Observable<OrderReturns> {
        return this._http.get<{ data: OrderReturns }>(`${this._base}${APIEndpoint.GET_RETURNS_FOR_ORDER}`, { params: { order_oid } }).pipe(map((response) => response.data));
    }

    create(body: CreateReturn): Observable<CreatedReturn> {
        return this.write<CreatedReturn>(APIEndpoint.CREATE_RETURN, body);
    }

    confirm(body: ConfirmReturn): Observable<unknown> {
        return this.write(APIEndpoint.CONFIRM_RETURN, body);
    }

    cancel(oid: string, reason: string): Observable<unknown> {
        return this.write(APIEndpoint.CANCEL_RETURN, { oid, reason });
    }

    private write<T = unknown>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }
}
