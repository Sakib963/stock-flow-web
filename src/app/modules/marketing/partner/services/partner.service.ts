import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PartnerDetails, PartnerPayload } from '@app/core/models/partner.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PartnerService {
    private readonly _http = inject(HttpClient);

    readonly saving = signal(false);

    details(oid: string): Observable<PartnerDetails> {
        return this._http.get<{ data: PartnerDetails }>(`${environment.baseUrl}${APIEndpoint.GET_PARTNER_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    create(payload: PartnerPayload): Observable<string> {
        this.saving.set(true);
        return this._http.post<{ data: { oid: string } }>(`${environment.baseUrl}${APIEndpoint.CREATE_PARTNER}`, payload).pipe(
            map((response) => response.data.oid),
            finalize(() => this.saving.set(false))
        );
    }

    /** Whether anything changed: the server writes nothing when the record already says this. */
    update(payload: PartnerPayload): Observable<boolean> {
        this.saving.set(true);
        return this._http.post<{ data?: { changed?: boolean } }>(`${environment.baseUrl}${APIEndpoint.UPDATE_PARTNER_DETAILS}`, payload).pipe(
            map((response) => response?.data?.changed !== false),
            finalize(() => this.saving.set(false))
        );
    }

    /** A courtesy while typing; the unique index is what refuses a duplicate. */
    isAvailable(value: string, oid?: string): Observable<boolean> {
        const params = { value, ...(oid ? { oid } : {}) };
        return this._http.get<{ data: { available: boolean } }>(`${environment.baseUrl}${APIEndpoint.CHECK_PARTNER_AVAILABILITY}`, { params }).pipe(map((response) => response.data.available));
    }

    /** True when the database refused the name as taken; the copy for it is ours, in both languages. */
    nameTaken(error: unknown): boolean {
        return error instanceof HttpErrorResponse && error.status === 409 && error.error?.data?.field === 'name';
    }
}
