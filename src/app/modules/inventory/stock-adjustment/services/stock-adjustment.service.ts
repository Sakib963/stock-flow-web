import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { AisleChoice, WarehouseChoice } from '@app/core/models/purchase-order.model';
import { AdjustableProduct, StockAdjustmentPayload, StockAdjustmentRecord } from '@app/core/models/stock-adjustment.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

/** Nothing here is cached: an adjustment carries stock, and the batch picker carries what is free now. */
@Injectable({ providedIn: 'root' })
export class StockAdjustmentService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    details(oid: string): Observable<StockAdjustmentRecord> {
        return this._http.get<{ data: StockAdjustmentRecord }>(`${this._base}${APIEndpoint.GET_STOCK_ADJUSTMENT_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    searchProducts(search: string): Observable<AdjustableProduct[]> {
        return this._http.get<{ data: AdjustableProduct[] }>(`${this._base}${APIEndpoint.GET_PRODUCT_LIST_FOR_ADJUSTMENT}`, { params: { search, limit: 20 } }).pipe(map((response) => response.data));
    }

    warehouses(): Observable<WarehouseChoice[]> {
        return this._http.get<{ data: WarehouseChoice[] }>(`${this._base}${APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN}`).pipe(map((response) => response.data));
    }

    aisles(): Observable<AisleChoice[]> {
        return this._http.get<{ data: AisleChoice[] }>(`${this._base}${APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN}`).pipe(map((response) => response.data));
    }

    create(payload: StockAdjustmentPayload): Observable<{ oid: string; adjustment_number: string }> {
        return this.write<{ oid: string; adjustment_number: string }>(APIEndpoint.CREATE_STOCK_ADJUSTMENT, payload);
    }

    /** Whether anything changed: the server writes nothing when the adjustment already says this. */
    update(payload: StockAdjustmentPayload): Observable<boolean> {
        return this.write<{ changed?: boolean }>(APIEndpoint.UPDATE_STOCK_ADJUSTMENT, payload).pipe(map((data) => data?.changed !== false));
    }

    verify(oid: string): Observable<{ units_in: number; units_out: number }> {
        return this.write<{ units_in: number; units_out: number }>(APIEndpoint.VERIFY_STOCK_ADJUSTMENT, { oid });
    }

    reject(oid: string, reason: string): Observable<void> {
        return this.write<unknown>(APIEndpoint.REJECT_STOCK_ADJUSTMENT, { oid, reason }).pipe(map(() => undefined));
    }

    cancel(oid: string, reason: string): Observable<void> {
        return this.write<unknown>(APIEndpoint.CANCEL_STOCK_ADJUSTMENT, { oid, reason }).pipe(map(() => undefined));
    }

    /** The spreadsheet itself, not the envelope; its name travels in `X-Filename`. */
    report(oid: string): Observable<HttpResponse<Blob>> {
        return this._http.get(`${this._base}${APIEndpoint.GENERATE_STOCK_ADJUSTMENT_REPORT}/${oid}`, { observe: 'response', responseType: 'blob' });
    }

    private write<T>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response?.data),
            finalize(() => this.saving.set(false))
        );
    }
}
