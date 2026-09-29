import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { AisleChoice, PaymentPayload, PurchasableProduct, PurchaseOrderDetails, PurchaseOrderPayload, PurchaseOrderReport, SupplierChoice, VerifyLinePayload, VerifyResult, WarehouseChoice } from '@app/core/models/purchase-order.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

/**
 * Nothing here is cached: an order carries stock, prices and payments, and the product search
 * carries what is on the shelf now.
 */
@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    details(oid: string): Observable<PurchaseOrderDetails> {
        return this._http.get<{ data: PurchaseOrderDetails }>(`${this._base}${APIEndpoint.GET_PURCHASE_ORDER_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    searchProducts(search: string): Observable<PurchasableProduct[]> {
        return this._http.get<{ data: PurchasableProduct[] }>(`${this._base}${APIEndpoint.GET_PRODUCT_LIST_FOR_PURCHASE}`, { params: { search, limit: 20 } }).pipe(map((response) => response.data));
    }

    suppliers(): Observable<SupplierChoice[]> {
        return this._http.get<{ data: SupplierChoice[] }>(`${this._base}${APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN}`).pipe(map((response) => response.data));
    }

    warehouses(): Observable<WarehouseChoice[]> {
        return this._http.get<{ data: WarehouseChoice[] }>(`${this._base}${APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN}`).pipe(map((response) => response.data));
    }

    /** Every active aisle, each naming its warehouse, so a line's aisle picker filters without asking again. */
    aisles(): Observable<AisleChoice[]> {
        return this._http.get<{ data: AisleChoice[] }>(`${this._base}${APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN}`).pipe(map((response) => response.data));
    }

    create(payload: PurchaseOrderPayload): Observable<{ oid: string; po_number: string }> {
        return this.write<{ oid: string; po_number: string }>(APIEndpoint.CREATE_PURCHASE_ORDER, payload);
    }

    /** Whether anything changed: the server writes nothing when the order already says this. */
    update(payload: PurchaseOrderPayload): Observable<boolean> {
        return this.write<{ changed?: boolean }>(APIEndpoint.UPDATE_PURCHASE_ORDER, payload).pipe(map((data) => data?.changed !== false));
    }

    recordPayment(payload: PaymentPayload): Observable<boolean> {
        return this.write<{ changed?: boolean }>(APIEndpoint.UPDATE_PURCHASE_ORDER_PAYMENT, payload).pipe(map((data) => data?.changed !== false));
    }

    verify(oid: string, lines: VerifyLinePayload[]): Observable<VerifyResult> {
        return this.write<VerifyResult>(APIEndpoint.VERIFY_PURCHASE_ORDER, { oid, lines });
    }

    cancel(oid: string, reason: string): Observable<void> {
        return this.write<unknown>(APIEndpoint.CANCEL_PURCHASE_ORDER, { oid, reason }).pipe(map(() => undefined));
    }

    /** The spreadsheet itself, not the envelope. The server checks `inventory.purchase-order.export`. */
    report(kind: PurchaseOrderReport, oid: string): Observable<HttpResponse<Blob>> {
        const endpoint = kind === 'summary' ? APIEndpoint.GET_PURCHASE_ORDER_REPORT : APIEndpoint.GET_PURCHASE_ORDER_PRODUCTS_REPORT;
        return this._http.post(`${this._base}${endpoint}`, { oid }, { observe: 'response', responseType: 'blob' });
    }

    private write<T>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response?.data),
            finalize(() => this.saving.set(false))
        );
    }
}
