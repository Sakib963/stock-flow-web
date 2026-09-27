import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { WarehouseDetails, WarehouseField, WarehousePayload, WarehouseReport } from '@app/core/models/warehouse.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WarehouseService {
    private readonly _http = inject(HttpClient);

    readonly saving = signal(false);

    /**
     * Never cached: the record carries the warehouse's stock numbers, which move with every sale.
     * Opened from the list, the page draws the list's row at once while this is in flight.
     */
    details(oid: string): Observable<WarehouseDetails> {
        return this._http.get<{ data: WarehouseDetails }>(`${environment.baseUrl}${APIEndpoint.GET_WAREHOUSE_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    create(payload: WarehousePayload): Observable<string> {
        this.saving.set(true);
        return this._http.post<{ data: { oid: string } }>(`${environment.baseUrl}${APIEndpoint.CREATE_WAREHOUSE}`, payload).pipe(
            map((response) => response.data.oid),
            finalize(() => this.saving.set(false))
        );
    }

    /** Whether anything changed: the server writes nothing when the record already says this. */
    update(payload: WarehousePayload): Observable<boolean> {
        this.saving.set(true);
        return this._http.post<{ data?: { changed?: boolean } }>(`${environment.baseUrl}${APIEndpoint.UPDATE_WAREHOUSE_DETAILS}`, payload).pipe(
            map((response) => response?.data?.changed !== false),
            finalize(() => this.saving.set(false))
        );
    }

    /**
     * Is this name or code free? `oid` is the warehouse being edited, so its own value does not come
     * back as taken. This is a courtesy to the person typing, never the check that matters: the
     * database refuses a duplicate whatever this answered a moment ago.
     */
    isAvailable(field: WarehouseField, value: string, oid?: string): Observable<boolean> {
        const params = { field, value, ...(oid ? { oid } : {}) };
        return this._http.get<{ data: { available: boolean } }>(`${environment.baseUrl}${APIEndpoint.CHECK_WAREHOUSE_AVAILABILITY}`, { params }).pipe(map((response) => response.data.available));
    }

    /**
     * Downloads one of the warehouse's reports.
     *
     * The response is the spreadsheet itself, not the envelope, so it is read as a blob with its
     * headers: the filename the server chose travels in `X-Filename`. The server checks
     * `configuration.warehouse.export` on both of these; the page hides the buttons with the same
     * code, which is UX only.
     */
    report(kind: WarehouseReport, oid: string): Observable<HttpResponse<Blob>> {
        const endpoint = kind === 'products' ? APIEndpoint.GENERATE_PRODUCT_LIST_REPORT_BY_WAREHOUSE : APIEndpoint.GENERATE_INVENTORY_REPORT_BY_WAREHOUSE;
        return this._http.post(`${environment.baseUrl}${endpoint}`, { oid }, { observe: 'response', responseType: 'blob' });
    }

    /** `oid` is the warehouse being edited, so its own code is not treated as taken. */
    generateCode(name: string, oid?: string): Observable<string> {
        const params = { name, ...(oid ? { oid } : {}) };
        return this._http.get<{ data: { code: string } }>(`${environment.baseUrl}${APIEndpoint.GENERATE_WAREHOUSE_CODE}`, { params }).pipe(map((response) => response.data.code));
    }

    /**
     * Which field the unique indexes refused, or null for any other failure.
     *
     * Only the field is taken. The server's sentence is English, and handing it to the screen is
     * what put an English message in front of a Bengali reader with the translated copy for the
     * same refusal sitting unused beside it.
     */
    conflictOf(error: unknown): WarehouseField | null {
        if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
        const field = error.error?.data?.field;
        return field === 'name' || field === 'code' ? field : null;
    }
}
