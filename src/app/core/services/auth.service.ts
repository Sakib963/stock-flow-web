import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { environment } from '@env/environment';
import { Observable, catchError, tap, throwError } from 'rxjs';

export interface UserInfo {
    role: string;
    name: string;
    email: string;
    photo: string;
    mobile_number: string;
    designation: string;
}

/** Which message the sign-in screen should show. Never says which field was wrong. */
export type LoginFailure = 'credentials' | 'network' | 'server' | 'disabled';

interface StoredTokens {
    access_token?: string;
    refresh_token?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly _http = inject(HttpClient);
    private readonly _router = inject(Router);

    readonly loading = signal(false);
    readonly userInfo = signal<UserInfo | null>(null);
    readonly role = computed(() => this.userInfo()?.role ?? '');

    /** Mirrors the stored token so guards and the shell can read session state synchronously. */
    private readonly _hasSession = signal(this.readTokens().access_token != null);
    readonly isAuthenticated = computed(() => this._hasSession());

    login(credentials: { email: string; password: string }): Observable<unknown> {
        this.loading.set(true);
        return this._http.post<{ code: number; message: string; data: StoredTokens }>(`${environment.baseUrl}${APIEndpoint.SIGN_IN}`, credentials).pipe(
            tap((response) => {
                this.storeTokens(response?.data);
                this.loading.set(false);
            }),
            catchError((error: HttpErrorResponse) => {
                this.loading.set(false);
                return throwError(() => error);
            })
        );
    }

    getUserInfo(): Observable<{ data: UserInfo }> {
        return this._http.get<{ data: UserInfo }>(`${environment.baseUrl}${APIEndpoint.GET_USER_INFO}`).pipe(tap((response) => this.userInfo.set(response?.data ?? null)));
    }

    refreshToken(): Observable<unknown> {
        return this._http.post<{ data: StoredTokens }>(`${environment.baseUrl}${APIEndpoint.REFRESH_TOKEN}`, { refresh_token: this.readTokens().refresh_token }).pipe(
            tap((response) => this.storeTokens(response?.data)),
            catchError((error: HttpErrorResponse) => {
                this.logout();
                return throwError(() => error);
            })
        );
    }

    logout(): void {
        this.clearTokens();
        this.userInfo.set(null);
        void this._router.navigate([Constants.LOGIN_ROUTE]);
    }

    getAccessToken(): string {
        return this.readTokens().access_token ?? '';
    }

    /**
     * Sorts a failed sign-in into the four cases the screen has copy for. Bad credentials and a
     * missing account deliberately collapse into one: telling someone the email exists but the
     * password is wrong confirms which accounts are real.
     */
    classifyFailure(error: HttpErrorResponse): LoginFailure {
        if (error.status === 0) return 'network';
        if (error.status === 403) return 'disabled';
        if (error.status === 401 || error.status === 404 || error.status === 400) return 'credentials';
        return 'server';
    }

    private readTokens(): StoredTokens {
        try {
            return JSON.parse(localStorage.getItem(Constants.AUTH_STORE_KEY) ?? '{}') as StoredTokens;
        } catch {
            // A corrupted entry is the same as no session, and must not break boot.
            return {};
        }
    }

    private storeTokens(tokens: StoredTokens | undefined): void {
        localStorage.setItem(
            Constants.AUTH_STORE_KEY,
            JSON.stringify({
                access_token: tokens?.access_token,
                refresh_token: tokens?.refresh_token,
            })
        );
        this._hasSession.set(tokens?.access_token != null);
    }

    private clearTokens(): void {
        localStorage.removeItem(Constants.AUTH_STORE_KEY);
        this._hasSession.set(false);
    }
}
