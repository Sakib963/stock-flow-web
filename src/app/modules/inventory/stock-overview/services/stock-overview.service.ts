import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { StockMovementRow } from '@app/core/models/stock-movement.model';
import { BatchBudgetPayload, ProductStock } from '@app/core/models/stock-overview.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

/** Stock, prices and budgets change with every sale and every edit, so nothing here is cached. */
@Injectable({ providedIn: 'root' })
export class StockOverviewService {
    private readonly _http = inject(HttpClient);

    readonly saving = signal(false);

    productStock(oid: string): Observable<ProductStock> {
        return this._http.get<{ data: ProductStock }>(`${environment.baseUrl}${APIEndpoint.GET_PRODUCT_STOCK}/${oid}`).pipe(map((response) => response.data));
    }

    /** The spreadsheet itself, not the envelope; its name travels in `X-Filename`. */
    report(oid: string): Observable<HttpResponse<Blob>> {
        return this._http.get(`${environment.baseUrl}${APIEndpoint.GENERATE_PRODUCT_STOCK_REPORT}/${oid}`, { observe: 'response', responseType: 'blob' });
    }

    /** The product's latest stock movements, newest first, for someone who may see the ledger. */
    movements(product_oid: string, limit = 10): Observable<StockMovementRow[]> {
        return this._http.get<{ data: { rows: StockMovementRow[] } }>(`${environment.baseUrl}${APIEndpoint.GET_STOCK_MOVEMENT_LIST}`, { params: { product_oid, limit } }).pipe(map((response) => response.data.rows));
    }

    /** Whether anything changed: the server writes nothing when the batch already says this. */
    updatePricing(inventory_oid: string, selling_price: number, maximum_discount: number): Observable<boolean> {
        return this.write(APIEndpoint.UPDATE_BATCH_PRICING, { inventory_oid, selling_price, maximum_discount });
    }

    updateBudget(payload: BatchBudgetPayload): Observable<boolean> {
        return this.write(APIEndpoint.UPDATE_BATCH_BUDGET, payload);
    }

    private write(endpoint: string, body: object): Observable<boolean> {
        this.saving.set(true);
        return this._http.post<{ data?: { changed?: boolean } }>(`${environment.baseUrl}${endpoint}`, body).pipe(
            map((response) => response.data?.changed !== false),
            finalize(() => this.saving.set(false))
        );
    }
}
