import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { BrandDetails, BrandField, BrandPayload, BrandReport } from '@app/core/models/brand.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BrandService {
    private readonly _http = inject(HttpClient);

    readonly saving = signal(false);

    /**
     * Never cached: the record carries the brand's stock numbers, which move with every sale.
     * Opened from the list, the page draws the list's row at once while this is in flight.
     */
    details(oid: string): Observable<BrandDetails> {
        return this._http.get<{ data: BrandDetails }>(`${environment.baseUrl}${APIEndpoint.GET_BRAND_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    create(payload: BrandPayload): Observable<string> {
        this.saving.set(true);
        return this._http.post<{ data: { oid: string } }>(`${environment.baseUrl}${APIEndpoint.CREATE_BRAND}`, payload).pipe(
            map((response) => response.data.oid),
            finalize(() => this.saving.set(false))
        );
    }

    /** Whether anything changed: the server writes nothing when the record already says this. */
    update(payload: BrandPayload): Observable<boolean> {
        this.saving.set(true);
        return this._http.post<{ data?: { changed?: boolean } }>(`${environment.baseUrl}${APIEndpoint.UPDATE_BRAND_DETAILS}`, payload).pipe(
            map((response) => response?.data?.changed !== false),
            finalize(() => this.saving.set(false))
        );
    }

    /**
     * Is this name free? `oid` is the brand being edited, so its own value does not come
     * back as taken. This is a courtesy to the person typing, never the check that matters: the
     * database refuses a duplicate whatever this answered a moment ago.
     */
    isAvailable(value: string, oid?: string): Observable<boolean> {
        const params = { value, ...(oid ? { oid } : {}) };
        return this._http.get<{ data: { available: boolean } }>(`${environment.baseUrl}${APIEndpoint.CHECK_BRAND_AVAILABILITY}`, { params }).pipe(map((response) => response.data.available));
    }

    /**
     * Downloads one of the brand's reports.
     *
     * The response is the spreadsheet itself, not the envelope, so it is read as a blob with its
     * headers: the filename the server chose travels in `X-Filename`. The server checks
     * `configuration.brands.export` on both of these; the page hides the buttons with the same
     * code, which is UX only.
     */
    report(kind: BrandReport, oid: string): Observable<HttpResponse<Blob>> {
        const endpoint = kind === 'products' ? APIEndpoint.GENERATE_PRODUCT_LIST_REPORT_BY_BRAND : APIEndpoint.GENERATE_INVENTORY_REPORT_BY_BRAND;
        return this._http.post(`${environment.baseUrl}${endpoint}`, { oid }, { observe: 'response', responseType: 'blob' });
    }


    /**
     * Which field the unique index refused, or null for any other failure.
     *
     * Only the field is taken. The server's sentence is English, and handing it to the screen is
     * what put an English message in front of a Bengali reader with the translated copy for the
     * same refusal sitting unused beside it.
     */
    conflictOf(error: unknown): BrandField | null {
        if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
        const field = error.error?.data?.field;
        return field === 'name' ? field : null;
    }
}
