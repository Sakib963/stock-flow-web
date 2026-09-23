import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CategoryConflict, CategoryDetails, CategoryField, CategoryPayload } from '@app/core/models/category.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    private readonly _http = inject(HttpClient);

    readonly saving = signal(false);

    details(oid: string): Observable<CategoryDetails> {
        return this._http.get<{ data: CategoryDetails }>(`${environment.baseUrl}${APIEndpoint.GET_CATEGORY_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    create(payload: CategoryPayload): Observable<string> {
        this.saving.set(true);
        return this._http.post<{ data: { oid: string } }>(`${environment.baseUrl}${APIEndpoint.CREATE_CATEGORY}`, payload).pipe(
            map((response) => response.data.oid),
            finalize(() => this.saving.set(false))
        );
    }

    update(payload: CategoryPayload): Observable<void> {
        this.saving.set(true);
        return this._http.post<void>(`${environment.baseUrl}${APIEndpoint.UPDATE_CATEGORY_DETAILS}`, payload).pipe(finalize(() => this.saving.set(false)));
    }

    /**
     * Is this name or code free? `oid` is the category being edited, so its own value does not come
     * back as taken. This is a courtesy to the person typing, never the check that matters: the
     * database refuses a duplicate whatever this answered a moment ago.
     */
    isAvailable(field: CategoryField, value: string, oid?: string): Observable<boolean> {
        const params = { field, value, ...(oid ? { oid } : {}) };
        return this._http.get<{ data: { available: boolean } }>(`${environment.baseUrl}${APIEndpoint.CHECK_CATEGORY_AVAILABILITY}`, { params }).pipe(map((response) => response.data.available));
    }

    /** `oid` is the category being edited, so its own code is not treated as taken. */
    generateCode(name: string, oid?: string): Observable<string> {
        const params = { name, ...(oid ? { oid } : {}) };
        return this._http.get<{ data: { category_code: string } }>(`${environment.baseUrl}${APIEndpoint.GENERATE_CATEGORY_CODE}`, { params }).pipe(map((response) => response.data.category_code));
    }

    /** The 409 the unique indexes produce, or null for any other failure. */
    conflictOf(error: unknown): CategoryConflict | null {
        if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
        const field = error.error?.data?.field;
        return field === 'name' || field === 'category_code' ? { field, message: error.error?.message ?? '' } : null;
    }
}
