import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { AisleDetails, AisleField, AislePayload, AisleReport } from '@app/core/models/aisle.model';
import { environment } from '@env/environment';
import { Observable, finalize, map, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AisleService {
    private readonly _http = inject(HttpClient);

    readonly saving = signal(false);

    /** Never cached: the record carries its stock numbers, which move with every sale. */
    details(oid: string): Observable<AisleDetails> {
        return this._http.get<{ data: AisleDetails }>(`${environment.baseUrl}${APIEndpoint.GET_AISLE_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    create(payload: AislePayload): Observable<string> {
        this.saving.set(true);
        return this._http.post<{ data: { oid: string } }>(`${environment.baseUrl}${APIEndpoint.CREATE_AISLE}`, payload).pipe(
            map((response) => response.data.oid),
            finalize(() => this.saving.set(false))
        );
    }

    /** Whether anything changed: the server writes nothing when the record already says this. */
    update(payload: AislePayload): Observable<boolean> {
        this.saving.set(true);
        return this._http.post<{ data?: { changed?: boolean } }>(`${environment.baseUrl}${APIEndpoint.UPDATE_AISLE_DETAILS}`, payload).pipe(
            map((response) => response?.data?.changed !== false),
            finalize(() => this.saving.set(false))
        );
    }

    /** A name is unique within its warehouse, so with no warehouse picked yet there is nothing to ask. */
    isAvailable(field: AisleField, value: string, context: { oid?: string; warehouseOid?: string }): Observable<boolean> {
        if (field === 'name' && !context.warehouseOid) return of(true);
        const params = { field, value, ...(context.oid ? { oid: context.oid } : {}), ...(field === 'name' ? { warehouse_oid: context.warehouseOid! } : {}) };
        return this._http.get<{ data: { available: boolean } }>(`${environment.baseUrl}${APIEndpoint.CHECK_AISLE_AVAILABILITY}`, { params }).pipe(map((response) => response.data.available));
    }

    generateCode(name: string, oid?: string): Observable<string> {
        const params = { name, ...(oid ? { oid } : {}) };
        return this._http.get<{ data: { code: string } }>(`${environment.baseUrl}${APIEndpoint.GENERATE_AISLE_CODE}`, { params }).pipe(map((response) => response.data.code));
    }

    report(kind: AisleReport, oid: string): Observable<HttpResponse<Blob>> {
        const endpoint = kind === 'products' ? APIEndpoint.GENERATE_PRODUCT_LIST_REPORT_BY_AISLE : APIEndpoint.GENERATE_INVENTORY_REPORT_BY_AISLE;
        return this._http.post(`${environment.baseUrl}${endpoint}`, { oid }, { observe: 'response', responseType: 'blob' });
    }

    /** Which field the unique indexes refused, or null for any other failure. */
    conflictOf(error: unknown): AisleField | null {
        if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
        const field = error.error?.data?.field;
        return field === 'name' || field === 'code' ? field : null;
    }

    /** A 400 because stock has been received into the aisle, so it cannot move to another warehouse. */
    movedWithStock(error: unknown): boolean {
        return error instanceof HttpErrorResponse && error.status === 400 && error.error?.data?.reason === 'has_stock';
    }

    /** A 400 about the parent: it was turned Inactive or removed while the form was open. */
    parentRefused(error: unknown): boolean {
        return error instanceof HttpErrorResponse && error.status === 400 && error.error?.data?.field === 'warehouse_oid';
    }
}
