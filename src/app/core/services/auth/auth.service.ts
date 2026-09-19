import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { ActiveSession, AuthStatus, LoginFailure, PendingSignOut, RefusalDetail, SessionEndReason, SignInGrant, StoredSession, TokenGrant } from '@app/core/models/auth.model';
import { ApiResponse } from '@app/core/models/api.model';
import { environment } from '@env/environment';
import { Observable, defer, finalize, firstValueFrom, map, shareReplay, tap } from 'rxjs';

const RENEWAL_LOCK = 'stockflow-token-renewal';

// Long enough for another tab to read why the session ended, short enough that a later ordinary
// sign-out is never explained with a stale reason.
const ENDED_NOTE_MS = 10_000;

const END_REASONS: Record<string, SessionEndReason> = {
    Expired: 'expired',
    SignOut: 'signed-out',
    RemoteSignOut: 'signed-out-elsewhere',
    SignOutEverywhere: 'signed-out-elsewhere',
    PasswordReset: 'password-changed',
    PasswordChanged: 'password-changed',
    UserDeactivated: 'account-disabled',
    TokenReuse: 'security',
};

/** Anything the server did not name reads as an ordinary expiry, never as an alarm. */
const endReasonOf = (error: HttpErrorResponse): SessionEndReason => {
    const detail = error.error?.data as Partial<RefusalDetail> | undefined;
    if (detail?.ended_reason && Object.hasOwn(END_REASONS, detail.ended_reason)) return END_REASONS[detail.ended_reason];
    return detail?.reason === 'reuse' ? 'security' : 'expired';
};

/**
 * The one place that knows whether someone is signed in.
 *
 * The access token lives in memory and nowhere else, so a reload asks the server for a new one with
 * the refresh token. That token travels however the server announces at sign-in: an HttpOnly cookie
 * the page never sees, or, where hosting puts the web app and the API on different sites, the
 * response body. Either way the session belongs to the browser, not the tab, exactly as a cookie
 * does: every tab shares it, and one not kept signed in lasts until the browser closes.
 *
 * Must not depend on SessionService. The token interceptor injects this service, the translation
 * files are fetched through that interceptor while LanguageService is still constructing, and
 * SessionService reaches LanguageService: that edge closes a ring Angular refuses to build.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly _http = inject(HttpClient);
    private readonly _router = inject(Router);

    private readonly _status = signal<AuthStatus>('unknown');
    readonly status = this._status.asReadonly();
    readonly isAuthenticated = computed(() => this._status() === 'authenticated');
    readonly initialized = computed(() => this._status() !== 'unknown');
    readonly loading = signal(false);

    private _accessToken: string | null = null;
    private _sessionId: string | null = null;

    /** Why the stored session was refused at start-up, for the guard that routes the first screen. */
    private _endedAtStart: SessionEndReason | null = null;

    /** One renewal at a time in this tab. The Web Lock covers the other tabs. */
    private _renewal: Observable<string> | null = null;

    constructor() {
        // A tab follows what another does to the shared session at once. A signed-out shell left
        // open on a counter machine is the next person's view of the last person's work.
        const onStorage = (event: StorageEvent) => this.onStorage(event);
        globalThis.addEventListener?.('storage', onStorage);
        inject(DestroyRef).onDestroy(() => globalThis.removeEventListener?.('storage', onStorage));
    }

    /** Resolves who is signed in, once, before the first route is guarded. */
    async restore(): Promise<void> {
        await this.replayPendingSignOut();

        const stored = this.readStored();
        if (!stored) {
            this._status.set('anonymous');
            return;
        }

        // The marker cookie dies with the browser, as a session cookie does. Without it, a session
        // that was not kept outlived the browser it belonged to: end it on the server rather than
        // leave it listed as a device, and start signed out.
        if (!stored.remember && !this.browserStillOpen()) {
            this.clearStored();
            if (stored.transport === 'body') void this.revoke({ refresh_token: stored.refresh_token }, null);
            this._status.set('anonymous');
            return;
        }

        try {
            await firstValueFrom(this.renew(false));
        } catch {
            // A refusal has already forgotten the session. No network or a server error leaves it
            // stored for the next load to try, and this load starts at the sign-in screen.
            if (this._status() === 'unknown') this._status.set('anonymous');
        }
    }

    login(credentials: { email: string; password: string; remember: boolean }): Observable<void> {
        this.loading.set(true);
        // Whatever session this browser held is replaced, not joined: by its token while that is
        // still here (a cookie travels on its own), and by the id of the last one either way.
        const held = this.readStored();
        const previous = this.read(Constants.LAST_SESSION_KEY);
        const body = { ...credentials, ...(held?.transport === 'body' ? { refresh_token: held.refresh_token } : {}), ...(previous ? { previous_session_id: previous } : {}) };

        return this._http.post<ApiResponse<SignInGrant>>(this.url(APIEndpoint.SIGN_IN), body, { withCredentials: true }).pipe(
            tap((response) => {
                // An undelivered sign-out under the cookie transport would travel with this new
                // sign-in's cookie, and end the session that was just opened instead of the old one.
                if (response.data.refresh_transport === 'cookie') this.clearPending();
                this.accept(response.data, credentials.remember);
            }),
            map(() => undefined),
            finalize(() => this.loading.set(false))
        );
    }

    /** For the interceptor. If the server refuses, the session is over and the person is told why. */
    renewAccessToken(): Observable<string> {
        return this.renew(true);
    }

    /**
     * Ends the session on the server and leaves for the sign-in screen.
     *
     * The navigation happens before any caller clears what the shell shows. The sign-in page is a
     * lazy chunk, and clearing first left the shell on screen, empty, until the chunk arrived.
     *
     * Leaving never waits on the server. A revoke that cannot be delivered is remembered and sent
     * on the next load, while the cookie or stored token that identifies the session still exists.
     */
    async signOut(): Promise<void> {
        const stored = this.readStored();
        const accessToken = this._accessToken;
        this.forget();

        if (stored || accessToken) void this.revoke(stored?.transport === 'body' ? { refresh_token: stored.refresh_token } : {}, accessToken);

        await this.goToSignIn();
    }

    /** Ends every session of this account, on every device, this one included. */
    async signOutEverywhere(): Promise<void> {
        await firstValueFrom(this._http.post(this.url(APIEndpoint.SIGN_OUT_EVERYWHERE), {}, { withCredentials: true }));
        this.forget();
        await this.goToSignIn();
    }

    /** Every device signed in to this account, this one first. */
    listSessions(): Observable<ActiveSession[]> {
        return this._http.get<ApiResponse<ActiveSession[]>>(this.url(APIEndpoint.GET_SESSIONS)).pipe(map((response) => response.data ?? []));
    }

    /** Signs out one of this account's other devices. This device leaves through `signOut`. */
    signOutSession(sessionId: string): Observable<void> {
        return this._http.post(this.url(APIEndpoint.SIGN_OUT_SESSION), { session_id: sessionId }).pipe(map(() => undefined));
    }

    /** Signs out every other device and keeps this one signed in. */
    signOutOtherDevices(): Observable<number> {
        return this._http.post<ApiResponse<{ sessions_closed: number }>>(this.url(APIEndpoint.SIGN_OUT_EVERYWHERE), { keep_current: true }).pipe(map((response) => response.data?.sessions_closed ?? 0));
    }

    getAccessToken(): string {
        return this._accessToken ?? '';
    }

    /** The session the shell's payload belongs to. Survives a renewal and changes only at sign-in. */
    sessionKey(): string {
        return this._sessionId ?? '';
    }

    /** Why the stored session was refused at start-up. Handed out once, so only the first screen explains it. */
    takeEndedReason(): SessionEndReason | null {
        const reason = this._endedAtStart;
        this._endedAtStart = null;
        return reason;
    }

    /**
     * Sorts a failed sign-in into the cases the screen has copy for. Bad credentials and a missing
     * account are one case on purpose: telling them apart confirms which accounts are real.
     */
    classifyFailure(error: HttpErrorResponse): LoginFailure {
        if (error.status === 0) return 'network';
        if (error.status === 403) return 'disabled';
        if (error.status === 429) return 'throttled';
        if (error.status === 401 || error.status === 400) return 'credentials';
        return 'server';
    }

    private renew(leaveOnRefusal: boolean): Observable<string> {
        this._renewal ??= defer(() => this.withRenewalLock(() => this.requestRenewal(leaveOnRefusal))).pipe(
            finalize(() => (this._renewal = null)),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        return this._renewal;
    }

    private async requestRenewal(leaveOnRefusal: boolean): Promise<string> {
        // Read inside the lock: another tab may have just spent the token and stored its replacement.
        const stored = this.readStored();
        if (!stored) {
            // Another tab ended the session and this request got here before its storage event.
            if (leaveOnRefusal) this.followOtherTab();
            else this.forget();
            throw new Error('There is no session to renew.');
        }

        try {
            const body = stored.transport === 'body' ? { refresh_token: stored.refresh_token } : {};
            const response = await firstValueFrom(this._http.post<ApiResponse<TokenGrant>>(this.url(APIEndpoint.REFRESH_TOKEN), body, { withCredentials: true }));
            this.accept(response.data, stored.remember);
            return response.data.access_token;
        } catch (error) {
            // Only the server saying no ends the session. No network or a server error is a failed
            // request, not a signed-out person, and a patchy counter connection must not cost a cart.
            if (error instanceof HttpErrorResponse && error.status === 401) this.end(leaveOnRefusal, endReasonOf(error));
            throw error;
        }
    }

    /**
     * Each renewal replaces the refresh token, so two tabs renewing at once would both spend the same
     * one, which the server reads as a stolen copy. The server tolerates that for a few seconds for
     * browsers without the Web Locks API.
     */
    private withRenewalLock<T>(work: () => Promise<T>): Promise<T> {
        const locks = globalThis.navigator?.locks;
        return locks ? locks.request(RENEWAL_LOCK, work) : work();
    }

    private accept(grant: TokenGrant, remember: boolean): void {
        this._accessToken = grant.access_token;
        this._sessionId = grant.session_id;
        const base = { session_id: grant.session_id, remember };
        this.writeStored(grant.refresh_transport === 'body' ? { transport: 'body', refresh_token: grant.refresh_token, ...base } : { transport: 'cookie', ...base });
        this.write(Constants.LAST_SESSION_KEY, grant.session_id);
        this.remove(Constants.SESSION_ENDED_KEY);
        if (!remember) this.markBrowserOpen();
        this._endedAtStart = null;
        this._status.set('authenticated');
    }

    /** The server refused the session. The note is written first, so other tabs read it as their storage empties. */
    private end(leave: boolean, reason: SessionEndReason): void {
        this.write(Constants.SESSION_ENDED_KEY, JSON.stringify({ reason, at: Date.now() }));
        this.forget();
        if (leave) void this.goToEnded(reason);
        else this._endedAtStart = reason;
    }

    private forget(): void {
        this._accessToken = null;
        this._sessionId = null;
        this.clearStored();
        this._status.set('anonymous');
    }

    private onStorage(event: StorageEvent): void {
        if (event.key !== Constants.AUTH_STORE_KEY && event.key !== null) return;
        const stored = this.readStored();

        if (this._status() === 'authenticated') {
            if (!stored) this.followOtherTab();
            // Someone signed in again in another tab. A reload takes up that session and its menu,
            // rather than carrying on as a person who has been replaced. A renewal keeps the id.
            else if (stored.session_id && stored.session_id !== this._sessionId) window.location.reload();
            return;
        }

        // Signed in from another tab while this one waited on the way in: follow it into the app.
        if (stored && this.onWayIn()) window.location.reload();
    }

    /** This tab's session was ended from another tab. Explain it the same way when that tab knew why. */
    private followOtherTab(): void {
        const note = this.readEndedNote();
        this.forget();
        if (note) void this.goToEnded(note);
        else void this.goToSignIn();
    }

    private goToSignIn(): Promise<void> {
        return this.leaveFor([Constants.LOGIN_ROUTE], {});
    }

    private goToEnded(reason: SessionEndReason): Promise<void> {
        // Where the person was, so signing in again takes them back to it.
        const origUrl = this._router.url.startsWith(Constants.APP_ROUTE) ? this._router.url : null;
        return this.leaveFor([Constants.SESSION_ENDED_ROUTE], { queryParams: origUrl ? { reason, origUrl } : { reason } });
    }

    private async leaveFor(commands: string[], extras: NavigationExtras): Promise<void> {
        const navigated = await this._router.navigate(commands, extras).catch(() => false);

        // If the lazy auth page cannot be fetched, loading it outright is the only way off a shell
        // that no longer has a session behind it.
        if (!navigated && !this.onWayIn()) {
            const target = this._router.serializeUrl(this._router.createUrlTree(commands, extras));
            window.location.assign(new URL(target.slice(1), document.baseURI).href);
        }
    }

    private onWayIn(): boolean {
        return [Constants.LOGIN_ROUTE, Constants.SESSION_ENDED_ROUTE].some((route) => this._router.url.startsWith(route));
    }

    private revoke(pending: PendingSignOut, accessToken: string | null): Promise<void> {
        this.writePending(pending);
        return this.sendSignOut(pending, accessToken);
    }

    private async sendSignOut(pending: PendingSignOut, accessToken: string | null): Promise<void> {
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        try {
            await firstValueFrom(this._http.post(this.url(APIEndpoint.SIGN_OUT), { refresh_token: pending.refresh_token ?? null }, { withCredentials: true, headers, keepalive: true }));
            this.clearPending();
        } catch (error) {
            // Delivered and refused is as final as delivered and accepted. Only an undelivered one
            // is worth sending again.
            if (error instanceof HttpErrorResponse && error.status > 0 && error.status < 500) this.clearPending();
        }
    }

    private async replayPendingSignOut(): Promise<void> {
        const pending = this.readPending();
        if (pending) await this.sendSignOut(pending, null);
    }

    private url(path: string): string {
        return `${environment.baseUrl}${path}`;
    }

    private readStored(): StoredSession | null {
        try {
            const parsed = JSON.parse(this.read(Constants.AUTH_STORE_KEY) ?? 'null') as Partial<StoredSession> | null;
            const base = { session_id: parsed?.session_id ?? '', remember: parsed?.remember !== false };
            if (parsed?.transport === 'cookie') return { transport: 'cookie', ...base };
            if (parsed?.transport === 'body' && parsed.refresh_token) return { transport: 'body', refresh_token: parsed.refresh_token, ...base };
            // Nothing, a corrupted entry, or one written before sessions were rebuilt: all mean no session.
            return null;
        } catch {
            return null;
        }
    }

    private writeStored(session: StoredSession): void {
        this.write(Constants.AUTH_STORE_KEY, JSON.stringify(session));
    }

    private clearStored(): void {
        this.remove(Constants.AUTH_STORE_KEY);
    }

    private readEndedNote(): SessionEndReason | null {
        try {
            const note = JSON.parse(this.read(Constants.SESSION_ENDED_KEY) ?? 'null') as { reason: SessionEndReason; at: number } | null;
            return note && Date.now() - note.at < ENDED_NOTE_MS ? note.reason : null;
        } catch {
            return null;
        }
    }

    private markBrowserOpen(): void {
        try {
            document.cookie = `${Constants.BROWSER_SESSION_COOKIE}=1; path=/; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
        } catch {
            // Cookies blocked. The next start reads the session as left by a closed browser.
        }
    }

    private browserStillOpen(): boolean {
        try {
            return document.cookie.split(';').some((part) => part.trim() === `${Constants.BROWSER_SESSION_COOKIE}=1`);
        } catch {
            return false;
        }
    }

    private readPending(): PendingSignOut | null {
        try {
            return JSON.parse(this.read(Constants.SIGN_OUT_PENDING_KEY) ?? 'null') as PendingSignOut | null;
        } catch {
            return null;
        }
    }

    private writePending(pending: PendingSignOut): void {
        this.write(Constants.SIGN_OUT_PENDING_KEY, JSON.stringify(pending));
    }

    private clearPending(): void {
        this.remove(Constants.SIGN_OUT_PENDING_KEY);
    }

    private read(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    private write(key: string, value: string): void {
        try {
            localStorage.setItem(key, value);
        } catch {
            // Storage blocked. The session lasts for this page only, which beats failing to sign in.
        }
    }

    private remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch {
            // Nothing to clear if storage cannot be reached.
        }
    }
}
