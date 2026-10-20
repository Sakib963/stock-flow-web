import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PhotoUpload } from '@app/core/models/photo-upload.model';
import { AssignableRole, UserDetails, UserField, UserPayload } from '@app/core/models/user.model';
import { PhotoUploadService } from '@app/shared/services/photo-upload/photo-upload.service';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly _http = inject(HttpClient);
    private readonly _photos = inject(PhotoUploadService);

    readonly saving = signal(false);

    details(oid: string): Observable<UserDetails> {
        return this._http.get<{ data: UserDetails }>(`${environment.baseUrl}${APIEndpoint.GET_USER_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    assignableRoles(): Observable<AssignableRole[]> {
        return this._http.get<{ data: AssignableRole[] }>(`${environment.baseUrl}${APIEndpoint.GET_ASSIGNABLE_ROLES}`).pipe(map((response) => response.data));
    }

    /** True when nobody else uses this email or phone. */
    isAvailable(field: 'email' | 'mobile_number', value: string, oid?: string): Observable<boolean> {
        let params = new HttpParams().set(field, value);
        if (oid) params = params.set('oid', oid);
        return this._http.get<{ data: Record<string, boolean> }>(`${environment.baseUrl}${APIEndpoint.CHECK_USER_TAKEN}`, { params }).pipe(map((response) => !response.data[field]));
    }

    uploadPhoto(file: File): Observable<PhotoUpload> {
        return this._photos.upload(APIEndpoint.SIGN_PROFILE_PHOTO_UPLOAD, file);
    }

    create(payload: UserPayload): Observable<string> {
        return this.send<{ oid: string }>(APIEndpoint.CREATE_USER, payload).pipe(map((data) => data.oid));
    }

    update(payload: UserPayload): Observable<{ changed: boolean }> {
        return this.send(APIEndpoint.UPDATE_USER, payload);
    }

    switchStatus(oid: string, status: 'Active' | 'Inactive'): Observable<unknown> {
        return this.send(APIEndpoint.SWITCH_USER_STATUS, { oid, status });
    }

    delete(oid: string): Observable<unknown> {
        return this.send(APIEndpoint.DELETE_USER, { oid });
    }

    signOutEverywhere(oid: string): Observable<{ devices: number }> {
        return this.send(APIEndpoint.SIGN_OUT_USER_EVERYWHERE, { oid });
    }

    signOutEveryone(): Observable<{ people: number; devices: number }> {
        return this.send(APIEndpoint.SIGN_OUT_EVERYONE, {});
    }

    /** The field a 409 names: a taken email or phone. A stale save names none. */
    conflictOf(error: unknown): UserField | 'stale' | null {
        if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
        return (error.error?.data?.field as UserField | undefined) ?? 'stale';
    }

    private send<T>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${environment.baseUrl}${endpoint}`, body).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }
}
