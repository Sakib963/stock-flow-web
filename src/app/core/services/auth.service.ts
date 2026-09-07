import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { environment } from '@env/environment';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';

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

    /**
     * One renewal at a time. A page that fires five requests at once gets five 401s, and all of
     * them have to wait on the same call rather than spending the refresh token five times over.
     */
    private _renewal: Observable<string> | null = null;

    login(credentials: { email: string; password: string; remember: boolean }): Observable<unknown> {
        this.loading.set(true);
        const { email, password, remember } = credentials;

        // Only the credentials go to the server. `remember` decides where the answer is kept.
        return this._http.post<{ code: number; message: string; data: StoredTokens }>(`${environment.baseUrl}${APIEndpoint.SIGN_IN}`, { email, password }).pipe(
            tap((response) => {
                this.storeTokens(response?.data, remember);
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

    /**
     * Trades an expired access token for a fresh one, sharing a call that is already in flight.
     *
     * The access token lives 30 minutes and the refresh token 7 days. Nothing used to call this, so
     * people were signed out mid-shift with a perfectly good refresh token sitting in storage.
     */
    renewAccessToken(): Observable<string> {
        if (this._renewal) return this._renewal;

        const { refresh_token } = this.readTokens();
        if (!refresh_token) {
            this.logout();
            return throwError(() => new Error('No refresh token stored'));
        }

        this._renewal = this._http.post<{ data: StoredTokens }>(`${environment.baseUrl}${APIEndpoint.REFRESH_TOKEN}`, { refresh_token }).pipe(
            map((response) => {
                // The server answers with the same refresh token, and `remembered()` carries over
                // the choice made at sign-in, so a renewal cannot quietly move the session from
                // this tab into the machine's permanent storage or the other way round.
                this.storeTokens({ access_token: response?.data?.access_token, refresh_token: response?.data?.refresh_token ?? refresh_token }, this.remembered());
                return this.getAccessToken();
            }),
            catchError((error: HttpErrorResponse) => {
                // The refresh token is spent, expired or revoked. This is the one place where
                // ending the session is the right answer rather than a guess.
                this.logout();
                return throwError(() => error);
            }),
            finalize(() => (this._renewal = null)),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this._renewal;
    }

    /**
     * Ends the session on the server as well as in this browser.
     *
     * Signing out used to be a storage delete and nothing else, so the access token stayed usable
     * for the rest of its 30 minutes and the refresh token for another 7 days. On a shared counter
     * machine that is a copied token outliving the person who left.
     *
     * The request goes first and the local clear follows immediately: the interceptor has already
     * attached the bearer token by the time this returns, so the person leaves at once and the
     * server closes the row on its own time. What the server answers cannot change the outcome,
     * because someone signing out on a machine with no network still expects the screen locked
     * behind a password.
     */
    signOut(): void {
        const { access_token, refresh_token } = this.readTokens();

        // Either token is enough for the server to find the session, which matters because the
        // access token has usually expired by the time somebody signs out.
        if (access_token || refresh_token) {
            this._http
                .post(`${environment.baseUrl}${APIEndpoint.SIGN_OUT}`, { refresh_token: refresh_token ?? null })
                .pipe(catchError(() => of(null)))
                .subscribe();
        }

        this.logout();
    }

    /** Forgets the session in this browser only. To end it on the server too, use `signOut`. */
    logout(): void {
        this.clearTokens();
        this.userInfo.set(null);
        void this._router.navigate([Constants.LOGIN_ROUTE]);
    }

    getAccessToken(): string {
        return this.readTokens().access_token ?? '';
    }

    /**
     * Identifies the signed-in session rather than the current token. It survives a renewal and
     * changes only at a new sign-in, which is what tells the shell whether the payload it holds
     * belongs to the person in front of it.
     */
    sessionKey(): string {
        return this.readTokens().refresh_token ?? '';
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

    /**
     * Where the session lives follows what the person asked for at sign-in. Kept signed in means
     * the machine remembers across restarts, not kept means the session dies with the tab, which
     * is what someone borrowing the counter machine for one order expects.
     */
    private remembered(): boolean {
        try {
            return localStorage.getItem(Constants.AUTH_STORE_KEY) != null;
        } catch {
            return false;
        }
    }

    private readTokens(): StoredTokens {
        try {
            const raw = sessionStorage.getItem(Constants.AUTH_STORE_KEY) ?? localStorage.getItem(Constants.AUTH_STORE_KEY);
            return JSON.parse(raw ?? '{}') as StoredTokens;
        } catch {
            // A corrupted entry, or storage blocked outright, is the same as no session and must
            // not break boot.
            return {};
        }
    }

    private storeTokens(tokens: StoredTokens | undefined, remember: boolean): void {
        const value = JSON.stringify({ access_token: tokens?.access_token, refresh_token: tokens?.refresh_token });

        try {
            // Only ever one of the two holds a session, so a later read cannot find two answers.
            (remember ? sessionStorage : localStorage).removeItem(Constants.AUTH_STORE_KEY);
            (remember ? localStorage : sessionStorage).setItem(Constants.AUTH_STORE_KEY, value);
        } catch {
            // Storage blocked. The session lives for this page only, which is better than a crash
            // on the screen whose whole job is letting people in.
        }

        this._hasSession.set(tokens?.access_token != null);
    }

    private clearTokens(): void {
        try {
            localStorage.removeItem(Constants.AUTH_STORE_KEY);
            sessionStorage.removeItem(Constants.AUTH_STORE_KEY);
        } catch {
            // Nothing to forget if storage cannot be reached in the first place.
        }

        this._hasSession.set(false);
    }
}
