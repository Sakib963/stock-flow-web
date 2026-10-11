import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { BatchOrder, DeliveryBatchDetails, LeftOutOrder } from '@app/core/models/delivery-batch.model';
import { Courier } from '@app/core/models/order.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

/** Nothing here is cached: a batch carries orders, holds and money to collect. */
@Injectable({ providedIn: 'root' })
export class DeliveryBatchService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    details(oid: string): Observable<DeliveryBatchDetails> {
        return this._http.get<{ data: DeliveryBatchDetails }>(`${this._base}${APIEndpoint.GET_DELIVERY_BATCH_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    readyToSend(): Observable<BatchOrder[]> {
        return this._http.get<{ data: BatchOrder[] }>(`${this._base}${APIEndpoint.GET_ORDERS_READY_TO_SEND}`).pipe(map((response) => response.data));
    }

    uploadFile(oid: string): Observable<HttpResponse<Blob>> {
        return this._http.get(`${this._base}${APIEndpoint.GET_DELIVERY_BATCH_UPLOAD_FILE}/${oid}`, { responseType: 'blob', observe: 'response' });
    }

    create(body: { oid: string; courier: Courier; note: string | null; order_oids: string[] }): Observable<{ oid: string; batch_no: string }> {
        return this.write(APIEndpoint.CREATE_DELIVERY_BATCH, body);
    }

    setOrders(oid: string, order_oids: string[]): Observable<{ oid: string; changed: boolean }> {
        return this.write(APIEndpoint.UPDATE_DELIVERY_BATCH_ORDERS, { oid, order_oids });
    }

    handOver(oid: string): Observable<{ dispatched: number; left_out: LeftOutOrder[] }> {
        return this.write(APIEndpoint.HAND_OVER_DELIVERY_BATCH, { oid });
    }

    deliver(oid: string, order_oids: string[]): Observable<{ delivered: number; left_out: LeftOutOrder[] }> {
        return this.write(APIEndpoint.DELIVER_DELIVERY_BATCH, { oid, order_oids });
    }

    cancel(oid: string, note: string): Observable<unknown> {
        return this.write(APIEndpoint.CANCEL_DELIVERY_BATCH, { oid, note });
    }

    private write<T = unknown>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }
}
