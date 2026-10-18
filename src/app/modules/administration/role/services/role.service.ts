import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { GrantTree, RoleDetails, RolePayload, RoleSaved, RoleStatus } from '@app/core/models/role.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoleService {
    private readonly _http = inject(HttpClient);

    readonly saving = signal(false);

    tree(): Observable<GrantTree> {
        return this._http.get<{ data: GrantTree }>(`${environment.baseUrl}${APIEndpoint.GET_ROLE_TREE}`).pipe(map((response) => response.data));
    }

    details(oid: string): Observable<RoleDetails> {
        return this._http.get<{ data: RoleDetails }>(`${environment.baseUrl}${APIEndpoint.GET_ROLE_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    create(payload: RolePayload): Observable<string> {
        return this.send<{ oid: string }>(APIEndpoint.CREATE_ROLE, payload).pipe(map((data) => data.oid));
    }

    update(payload: RolePayload): Observable<RoleSaved> {
        return this.send<RoleSaved>(APIEndpoint.UPDATE_ROLE, payload);
    }

    switchStatus(oid: string, status: RoleStatus): Observable<unknown> {
        return this.send(APIEndpoint.SWITCH_ROLE_STATUS, { oid, status });
    }

    delete(oid: string): Observable<unknown> {
        return this.send(APIEndpoint.DELETE_ROLE, { oid });
    }

    conflictOf(error: unknown): 'name' | 'stale' | null {
        if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
        if (error.error?.data?.field === 'name') return 'name';
        return error.error?.data?.codes ? 'stale' : null;
    }

    private send<T>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${environment.baseUrl}${endpoint}`, body).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }
}
