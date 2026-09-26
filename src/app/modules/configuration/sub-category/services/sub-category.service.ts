import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SubCategoryDetails, SubCategoryField, SubCategoryPayload, SubCategoryReport } from '@app/core/models/sub-category.model';
import { environment } from '@env/environment';
import { Observable, finalize, map, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SubCategoryService {
    private readonly _http = inject(HttpClient);

    readonly saving = signal(false);

    /** Never cached: the record carries its stock numbers, which move with every sale. */
    details(oid: string): Observable<SubCategoryDetails> {
        return this._http.get<{ data: SubCategoryDetails }>(`${environment.baseUrl}${APIEndpoint.GET_SUB_CATEGORY_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    create(payload: SubCategoryPayload): Observable<string> {
        this.saving.set(true);
        return this._http.post<{ data: { oid: string } }>(`${environment.baseUrl}${APIEndpoint.CREATE_SUB_CATEGORY}`, payload).pipe(
            map((response) => response.data.oid),
            finalize(() => this.saving.set(false))
        );
    }

    update(payload: SubCategoryPayload): Observable<void> {
        this.saving.set(true);
        return this._http.post<void>(`${environment.baseUrl}${APIEndpoint.UPDATE_SUB_CATEGORY_DETAILS}`, payload).pipe(finalize(() => this.saving.set(false)));
    }

    /** A name is unique within its category, so with no category picked yet there is nothing to ask. */
    isAvailable(field: SubCategoryField, value: string, context: { oid?: string; categoryOid?: string }): Observable<boolean> {
        if (field === 'name' && !context.categoryOid) return of(true);
        const params = { field, value, ...(context.oid ? { oid: context.oid } : {}), ...(field === 'name' ? { category_oid: context.categoryOid! } : {}) };
        return this._http.get<{ data: { available: boolean } }>(`${environment.baseUrl}${APIEndpoint.CHECK_SUB_CATEGORY_AVAILABILITY}`, { params }).pipe(map((response) => response.data.available));
    }

    generateCode(name: string, oid?: string): Observable<string> {
        const params = { name, ...(oid ? { oid } : {}) };
        return this._http.get<{ data: { category_code: string } }>(`${environment.baseUrl}${APIEndpoint.GENERATE_SUB_CATEGORY_CODE}`, { params }).pipe(map((response) => response.data.category_code));
    }

    report(kind: SubCategoryReport, oid: string): Observable<HttpResponse<Blob>> {
        const endpoint = kind === 'products' ? APIEndpoint.GENERATE_PRODUCT_LIST_REPORT_BY_SUB_CATEGORY : APIEndpoint.GENERATE_INVENTORY_REPORT_BY_SUB_CATEGORY;
        return this._http.post(`${environment.baseUrl}${endpoint}`, { oid }, { observe: 'response', responseType: 'blob' });
    }

    /** Which field the unique indexes refused, or null for any other failure. */
    conflictOf(error: unknown): SubCategoryField | null {
        if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
        const field = error.error?.data?.field;
        return field === 'name' || field === 'category_code' ? field : null;
    }

    /** A 400 about the parent: it was turned Inactive or removed while the form was open. */
    parentRefused(error: unknown): boolean {
        return error instanceof HttpErrorResponse && error.status === 400 && error.error?.data?.field === 'category_oid';
    }
}
