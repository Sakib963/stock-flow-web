import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { AddressPayload, CustomerDetails, CustomerFlag, CustomerPayload, Place } from '@app/core/models/customer.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomerService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    /** Never cached: the record carries what the customer owes, which moves with every sale. */
    details(oid: string): Observable<CustomerDetails> {
        return this._http.get<{ data: CustomerDetails }>(`${this._base}${APIEndpoint.GET_CUSTOMER_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    create(payload: CustomerPayload): Observable<string> {
        return this.write<{ oid: string }>(APIEndpoint.CREATE_CUSTOMER, payload).pipe(map((data) => data.oid));
    }

    /** Whether anything changed: the server writes nothing when the record already says this. */
    update(payload: CustomerPayload): Observable<boolean> {
        return this.write<{ changed?: boolean }>(APIEndpoint.UPDATE_CUSTOMER_DETAILS, payload).pipe(map((data) => data?.changed !== false));
    }

    flag(oid: string, flag: CustomerFlag, reason: string | null): Observable<boolean> {
        return this.write<{ changed?: boolean }>(APIEndpoint.FLAG_CUSTOMER, { oid, flag, reason }).pipe(map((data) => data?.changed !== false));
    }

    addAddress(customerOid: string, address: AddressPayload): Observable<unknown> {
        return this.write(APIEndpoint.CREATE_CUSTOMER_ADDRESS, { customer_oid: customerOid, ...address });
    }

    updateAddress(oid: string, address: AddressPayload): Observable<unknown> {
        return this.write(APIEndpoint.UPDATE_CUSTOMER_ADDRESS, { oid, ...address });
    }

    removeAddress(oid: string): Observable<unknown> {
        return this.write(APIEndpoint.RETIRE_CUSTOMER_ADDRESS, { oid });
    }

    districts(search: string): Observable<Place[]> {
        return this.places({ level: 'District', search });
    }

    thanas(districtOid: string, search: string): Observable<Place[]> {
        return this.places({ level: 'Thana', district_oid: districtOid, search, limit: 50 });
    }

    /**
     * A 409 because the phone is someone else's, with that customer when the server could name them.
     * Only the owner is taken: the server's sentence is English and the page says it in the reader's language.
     */
    phoneTaken(error: unknown): { owner: { oid: string; name: string } | null } | null {
        if (!(error instanceof HttpErrorResponse) || error.status !== 409 || error.error?.data?.field !== 'phone') return null;
        return { owner: error.error.data.customer ?? null };
    }

    private places(params: Record<string, string | number>): Observable<Place[]> {
        return this._http.get<{ data: Place[] }>(`${this._base}${APIEndpoint.SEARCH_LOCATION}`, { params }).pipe(map((response) => response.data));
    }

    private write<T>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response?.data),
            finalize(() => this.saving.set(false))
        );
    }
}
