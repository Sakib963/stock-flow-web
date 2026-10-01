import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { DisposableProduct, DisposalPayload, DisposalRecord } from '@app/core/models/disposal.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

/** Nothing here is cached: an disposal carries stock, and the batch picker carries what is free now. */
@Injectable({ providedIn: 'root' })
export class DisposalService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    details(oid: string): Observable<DisposalRecord> {
        return this._http.get<{ data: DisposalRecord }>(`${this._base}${APIEndpoint.GET_DISPOSAL_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    searchProducts(search: string): Observable<DisposableProduct[]> {
        return this._http.get<{ data: DisposableProduct[] }>(`${this._base}${APIEndpoint.GET_PRODUCT_LIST_FOR_DISPOSAL}`, { params: { search, limit: 20 } }).pipe(map((response) => response.data));
    }

    create(payload: DisposalPayload): Observable<{ oid: string; dispose_no: string }> {
        return this.write<{ oid: string; dispose_no: string }>(APIEndpoint.CREATE_DISPOSAL, payload);
    }

    /** Whether anything changed: the server writes nothing when the disposal already says this. */
    update(payload: DisposalPayload): Observable<boolean> {
        return this.write<{ changed?: boolean }>(APIEndpoint.UPDATE_DISPOSAL, payload).pipe(map((data) => data?.changed !== false));
    }

    approve(oid: string): Observable<{ dispose_no: string }> {
        return this.write<{ dispose_no: string }>(APIEndpoint.APPROVE_DISPOSAL, { oid });
    }

    reject(oid: string, reason: string): Observable<void> {
        return this.write<unknown>(APIEndpoint.REJECT_DISPOSAL, { oid, reason }).pipe(map(() => undefined));
    }

    cancel(oid: string, reason: string): Observable<void> {
        return this.write<unknown>(APIEndpoint.CANCEL_DISPOSAL, { oid, reason }).pipe(map(() => undefined));
    }

    /** The spreadsheet itself, not the envelope; its name travels in `X-Filename`. */
    report(oid: string): Observable<HttpResponse<Blob>> {
        return this._http.get(`${this._base}${APIEndpoint.GENERATE_DISPOSAL_REPORT}/${oid}`, { observe: 'response', responseType: 'blob' });
    }

    private write<T>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response?.data),
            finalize(() => this.saving.set(false))
        );
    }
}
