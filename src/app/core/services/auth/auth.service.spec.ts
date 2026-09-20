import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { RefreshTransport, TokenGrant } from '@app/core/models/auth.model';
import { AuthService } from './auth.service';

const stored = () => JSON.parse(localStorage.getItem(Constants.AUTH_STORE_KEY) ?? 'null');
const pending = () => JSON.parse(localStorage.getItem(Constants.SIGN_OUT_PENDING_KEY) ?? 'null');
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const browserOpen = () => document.cookie.split(';').some((part) => part.trim() === `${Constants.BROWSER_SESSION_COOKIE}=1`);
const closeBrowser = () => (document.cookie = `${Constants.BROWSER_SESSION_COOKIE}=; max-age=0; path=/`);
const unauthorized = { status: 401, statusText: 'Unauthorized' };

const grant = (n: number, transport: RefreshTransport = 'body'): TokenGrant => ({
    access_token: `access-${n}`,
    expires_in: 900,
    session_id: 'session-1',
    refresh_transport: transport,
    ...(transport === 'body' ? { refresh_token: `refresh-${n}` } : {}),
});

describe('AuthService', () => {
    let auth: AuthService;
    let backend: HttpTestingController;
    let router: Router;

    const signIn = (remember: boolean, transport: RefreshTransport = 'body') => {
        auth.login({ email: 'owner@shop.com', password: 'correct', remember }).subscribe();
        backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).flush({ code: 200, message: 'ok', data: { ...grant(1, transport), user: { id: 'u1', email: 'owner@shop.com', name: 'Samiha', role: 'Owner' } } });
    };

    const renewal = async () => {
        await settle();
        return backend.expectOne((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN));
    };

    const refuse = async (data: object) => {
        const failed = new Promise((resolve) => auth.renewAccessToken().subscribe({ error: resolve }));
        (await renewal()).flush({ code: 401, data }, unauthorized);
        await failed;
    };

    beforeEach(() => {
        localStorage.clear();
        closeBrowser();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }])],
        });
        auth = TestBed.inject(AuthService);
        backend = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
    });

    afterEach(() => {
        localStorage.clear();
        closeBrowser();
    });

    it('starts undecided, so no guard acts on a guess', () => {
        expect(auth.status()).toBe('unknown');
        expect(auth.initialized()).toBe(false);
    });

    it('sends the credentials and the keep-signed-in choice, with cookies allowed', () => {
        auth.login({ email: 'owner@shop.com', password: 'correct', remember: false }).subscribe();

        const request = backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).request;
        expect(request.body).toEqual({ email: 'owner@shop.com', password: 'correct', remember: false });
        expect(request.withCredentials).toBe(true);
    });

    /** Otherwise the session this browser held stays open, listed as a device nobody can reach. */
    it('names the session this browser held, by its token and its id, so signing in again replaces it', () => {
        localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ transport: 'body', refresh_token: 'refresh-old', session_id: 'session-old', remember: true }));
        localStorage.setItem(Constants.LAST_SESSION_KEY, 'session-old');

        auth.login({ email: 'owner@shop.com', password: 'correct', remember: true }).subscribe();

        const request = backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).request;
        expect(request.body).toEqual({ email: 'owner@shop.com', password: 'correct', remember: true, refresh_token: 'refresh-old', previous_session_id: 'session-old' });
    });

    /** A not-kept session in a browser that was closed: the token went with it, the id did not. */
    it('still names the last session when its token is gone', () => {
        localStorage.setItem(Constants.LAST_SESSION_KEY, 'session-old');

        auth.login({ email: 'owner@shop.com', password: 'correct', remember: false }).subscribe();

        const request = backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).request;
        expect(request.body).toEqual({ email: 'owner@shop.com', password: 'correct', remember: false, previous_session_id: 'session-old' });
    });

    /** Storage is readable by any script on the page. The access token never goes there. */
    it('keeps the access token in memory only', () => {
        signIn(true);

        expect(auth.getAccessToken()).toBe('access-1');
        expect(auth.isAuthenticated()).toBe(true);
        expect(stored()).toEqual({ transport: 'body', refresh_token: 'refresh-1', session_id: 'session-1', remember: true });
        expect(localStorage.getItem(Constants.LAST_SESSION_KEY)).toBe('session-1');
    });

    /** The same as a session cookie: every tab shares it, and it ends with the browser. */
    it('keeps a not-kept session where every tab shares it, marked to end with the browser', () => {
        signIn(false);

        expect(stored()).toEqual({ transport: 'body', refresh_token: 'refresh-1', session_id: 'session-1', remember: false });
        expect(browserOpen()).toBe(true);
    });

    it('marks nothing to end with the browser when asked to stay signed in', () => {
        signIn(true);

        expect(browserOpen()).toBe(false);
    });

    /** Under the cookie transport the browser holds the token where no script can reach it. */
    it('stores only a marker when the server uses the cookie', () => {
        signIn(false, 'cookie');

        expect(stored()).toEqual({ transport: 'cookie', session_id: 'session-1', remember: false });
    });

    it('identifies the session by its id, which outlives a renewal', async () => {
        signIn(true);
        expect(auth.sessionKey()).toBe('session-1');

        auth.renewAccessToken().subscribe();
        (await renewal()).flush({ code: 200, data: grant(2) });
        await settle();

        expect(auth.getAccessToken()).toBe('access-2');
        expect(auth.sessionKey()).toBe('session-1');
    });

    it('renews with the stored token and keeps the choice the person made', async () => {
        signIn(false);

        auth.renewAccessToken().subscribe();
        const request = await renewal();
        expect(request.request.body).toEqual({ refresh_token: 'refresh-1' });
        request.flush({ code: 200, data: grant(2) });
        await settle();

        expect(stored()).toEqual({ transport: 'body', refresh_token: 'refresh-2', session_id: 'session-1', remember: false });
    });

    it('renews through the cookie without sending a token', async () => {
        signIn(true, 'cookie');

        auth.renewAccessToken().subscribe();
        const request = await renewal();
        expect(request.request.body).toEqual({});
        expect(request.request.withCredentials).toBe(true);
        request.flush({ code: 200, data: grant(2, 'cookie') });
        await settle();

        expect(auth.getAccessToken()).toBe('access-2');
    });

    /** A patchy counter connection is not a signed-out person, and must not cost them a cart. */
    it('keeps the session when a renewal fails for any reason but a refusal', async () => {
        signIn(true);

        const failed = new Promise((resolve) => auth.renewAccessToken().subscribe({ error: resolve }));
        (await renewal()).flush({}, { status: 500, statusText: 'Server Error' });
        await failed;

        expect(auth.isAuthenticated()).toBe(true);
        expect(stored()).not.toBeNull();
    });

    it('forgets the session and says why when the renewal is refused', async () => {
        const navigate = vi.spyOn(router, 'navigate');
        signIn(true);

        await refuse({ reason: 'expired', ended_reason: 'Expired' });

        expect(auth.status()).toBe('anonymous');
        expect(stored()).toBeNull();
        expect(navigate).toHaveBeenCalledWith([Constants.SESSION_ENDED_ROUTE], { queryParams: { reason: 'expired' } });
    });

    it.each([
        [{ reason: 'ended', ended_reason: 'RemoteSignOut' }, 'signed-out-elsewhere'],
        [{ reason: 'ended', ended_reason: 'SignOutEverywhere' }, 'signed-out-elsewhere'],
        [{ reason: 'ended', ended_reason: 'PasswordReset' }, 'password-changed'],
        [{ reason: 'ended', ended_reason: 'PasswordChanged' }, 'password-changed'],
        [{ reason: 'ended', ended_reason: 'UserDeactivated' }, 'account-disabled'],
        [{ reason: 'reuse', ended_reason: 'TokenReuse' }, 'security'],
        [{ reason: 'ended', ended_reason: 'SignOut' }, 'signed-out'],
        [{ reason: 'invalid', ended_reason: null }, 'expired'],
        [{ reason: 'ended', ended_reason: 'constructor' }, 'expired'],
        [{}, 'expired'],
    ])('reads a refusal of %o as %s', async (data, reason) => {
        const navigate = vi.spyOn(router, 'navigate');
        signIn(true);

        await refuse(data);

        expect(navigate).toHaveBeenCalledWith([Constants.SESSION_ENDED_ROUTE], { queryParams: { reason } });
    });

    it('leaves a note for the other tabs, and signing in again clears it', async () => {
        signIn(true);
        await refuse({ reason: 'ended', ended_reason: 'PasswordReset' });

        expect(JSON.parse(localStorage.getItem(Constants.SESSION_ENDED_KEY) ?? 'null')?.reason).toBe('password-changed');

        signIn(true);
        expect(localStorage.getItem(Constants.SESSION_ENDED_KEY)).toBeNull();
    });

    it('ends the session without calling the server when there is nothing to renew with', async () => {
        const failed = new Promise<boolean>((resolve) => auth.renewAccessToken().subscribe({ error: () => resolve(true) }));

        expect(await failed).toBe(true);
        expect(auth.status()).toBe('anonymous');
        backend.expectNone((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN));
    });

    it('reads a 429 as throttling rather than bad credentials', () => {
        expect(auth.classifyFailure(new HttpErrorResponse({ status: 429 }))).toBe('throttled');
        expect(auth.classifyFailure(new HttpErrorResponse({ status: 401 }))).toBe('credentials');
    });

    describe('on start-up', () => {
        it('is signed in when the stored session renews', async () => {
            localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ transport: 'body', refresh_token: 'refresh-1' }));

            const restored = auth.restore();
            (await renewal()).flush({ code: 200, data: grant(2) });
            await restored;

            expect(auth.status()).toBe('authenticated');
            expect(auth.getAccessToken()).toBe('access-2');
        });

        it('is signed out without asking the server when nothing is stored', async () => {
            await auth.restore();

            expect(auth.status()).toBe('anonymous');
            backend.expectNone(() => true);
        });

        it('forgets a refused session and keeps the reason for the first screen, once', async () => {
            const navigate = vi.spyOn(router, 'navigate');
            localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ transport: 'cookie' }));

            const restored = auth.restore();
            (await renewal()).flush({ code: 401, data: { reason: 'ended', ended_reason: 'RemoteSignOut' } }, unauthorized);
            await restored;

            expect(auth.status()).toBe('anonymous');
            expect(stored()).toBeNull();
            // The guards route the first screen. Navigating from here would race them.
            expect(navigate).not.toHaveBeenCalled();
            expect(auth.takeEndedReason()).toBe('signed-out-elsewhere');
            expect(auth.takeEndedReason()).toBeNull();
        });

        it('keeps the stored session for the next load when the server cannot be reached', async () => {
            localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ transport: 'body', refresh_token: 'refresh-1' }));

            const restored = auth.restore();
            (await renewal()).error(new ProgressEvent('error'), { status: 0 });
            await restored;

            expect(auth.status()).toBe('anonymous');
            expect(stored()).not.toBeNull();
        });

        it('ignores an entry written before sessions were rebuilt', async () => {
            localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ access_token: 'old', refresh_token: 'old' }));

            await auth.restore();

            expect(auth.status()).toBe('anonymous');
            backend.expectNone(() => true);
        });

        /** Not kept signed in, and the browser has been closed since: what a session cookie would do. */
        it('ends a not-kept session left behind by a closed browser, instead of renewing it', async () => {
            localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ transport: 'body', refresh_token: 'refresh-1', session_id: 'session-1', remember: false }));

            await auth.restore();

            const revoke = backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT));
            expect(revoke.request.body).toEqual({ refresh_token: 'refresh-1' });
            revoke.flush({ code: 200, data: { sessions_closed: 1 } });
            backend.expectNone((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN));
            expect(auth.status()).toBe('anonymous');
            expect(stored()).toBeNull();
        });

        it('carries on with a not-kept session while the browser is still open', async () => {
            document.cookie = `${Constants.BROWSER_SESSION_COOKIE}=1; path=/`;
            localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ transport: 'body', refresh_token: 'refresh-1', session_id: 'session-1', remember: false }));

            const restored = auth.restore();
            (await renewal()).flush({ code: 200, data: grant(2) });
            await restored;

            expect(auth.status()).toBe('authenticated');
        });

        it('sends nothing for a closed browser under the cookie transport, whose cookie went with it', async () => {
            localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ transport: 'cookie', session_id: 'session-1', remember: false }));

            await auth.restore();

            backend.expectNone(() => true);
            expect(auth.status()).toBe('anonymous');
        });
    });

    describe('signing out', () => {
        it('tells the server which session to close, then forgets it', async () => {
            signIn(true);

            const leaving = auth.signOut();
            const request = backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT));
            expect(request.request.body).toEqual({ refresh_token: 'refresh-1' });
            expect(request.request.headers.get('Authorization')).toBe('Bearer access-1');
            request.flush({ code: 200, data: { sessions_closed: 1 } });
            await leaving;
            await settle();

            expect(auth.isAuthenticated()).toBe(false);
            expect(auth.getAccessToken()).toBe('');
            expect(stored()).toBeNull();
            expect(pending()).toBeNull();
        });

        /** A refresh token the server still honours, with nobody left who can see the session or end it,
         *  is worse than a person who has to press the button again. */
        it('stays signed in when the sign-out never reached the server', async () => {
            signIn(true);

            const leaving = auth.signOut();
            backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT)).error(new ProgressEvent('error'), { status: 0 });
            let failed = false;
            try {
                await leaving;
            } catch {
                failed = true;
            }
            await settle();

            expect(failed).toBe(true);
            expect(auth.isAuthenticated()).toBe(true);
            expect(stored()).not.toBeNull();
            // Nothing queued either: a replay on the next load would end a session this person is still using.
            expect(pending()).toBeNull();
        });

        /** The endpoint answers 200 for a session it could not find too, so anything else means it did
         *  not run, and a refused request is no more a closed session than an undelivered one. */
        it.each([
            ['a refusal', 400],
            ['a server fault', 500],
        ])('stays signed in on %s, because only a 200 says the session is over', async (_case, status) => {
            signIn(true);

            const leaving = auth.signOut();
            backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT)).flush({ code: status }, { status, statusText: 'Refused' });
            let failed = false;
            try {
                await leaving;
            } catch {
                failed = true;
            }
            await settle();

            expect(failed).toBe(true);
            expect(auth.isAuthenticated()).toBe(true);
            expect(stored()).not.toBeNull();
            expect(pending()).toBeNull();
        });

        /** The app is unusable at this point, so leaving cannot depend on the server answering. */
        it('abandons a session the app cannot use, and sends the sign-out again on the next start', async () => {
            signIn(true);

            const leaving = auth.abandonSession();
            backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT)).error(new ProgressEvent('error'), { status: 0 });
            await leaving;
            await settle();

            expect(auth.isAuthenticated()).toBe(false);
            expect(pending()).toEqual({ refresh_token: 'refresh-1' });

            const restored = auth.restore();
            const replay = backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT));
            expect(replay.request.body).toEqual({ refresh_token: 'refresh-1' });
            replay.flush({ code: 200, data: { sessions_closed: 1 } });
            await restored;

            expect(pending()).toBeNull();
            expect(auth.status()).toBe('anonymous');
        });

        it('does not call the server when there is nothing to close', async () => {
            await auth.signOut();

            backend.expectNone((r) => r.url.includes(APIEndpoint.SIGN_OUT));
            expect(pending()).toBeNull();
        });

        it('has navigated by the time it resolves, so the caller clears the shell after it has gone', async () => {
            const navigate = vi.spyOn(router, 'navigate');
            signIn(true, 'cookie');

            const leaving = auth.signOut();
            backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT)).flush({ code: 200 });
            await leaving;

            expect(navigate).toHaveBeenCalledWith([Constants.LOGIN_ROUTE], {});
        });

        /** An old cookie sign-out replayed after a new sign-in would carry the new cookie and end the wrong session. */
        it('drops an undelivered cookie sign-out once someone signs in again', () => {
            localStorage.setItem(Constants.SIGN_OUT_PENDING_KEY, JSON.stringify({}));

            signIn(true, 'cookie');

            expect(pending()).toBeNull();
        });

        it('signs out every device, then forgets this one', async () => {
            signIn(true);

            const leaving = auth.signOutEverywhere();
            backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT_EVERYWHERE)).flush({ code: 200, data: { sessions_closed: 3 } });
            await leaving;

            expect(auth.status()).toBe('anonymous');
            expect(stored()).toBeNull();
        });
    });

    describe('other tabs', () => {
        const otherTabWrote = (newValue: string | null) => window.dispatchEvent(new StorageEvent('storage', { key: Constants.AUTH_STORE_KEY, newValue }));

        it('follows a sign-out in another tab straight to sign-in', async () => {
            const navigate = vi.spyOn(router, 'navigate');
            signIn(true);

            localStorage.removeItem(Constants.AUTH_STORE_KEY);
            otherTabWrote(null);
            await settle();

            expect(auth.status()).toBe('anonymous');
            expect(auth.getAccessToken()).toBe('');
            expect(navigate).toHaveBeenCalledWith([Constants.LOGIN_ROUTE], {});
        });

        it('explains it the way the other tab did when that tab was told why', async () => {
            const navigate = vi.spyOn(router, 'navigate');
            signIn(true);

            localStorage.setItem(Constants.SESSION_ENDED_KEY, JSON.stringify({ reason: 'security', at: Date.now() }));
            localStorage.removeItem(Constants.AUTH_STORE_KEY);
            otherTabWrote(null);
            await settle();

            expect(navigate).toHaveBeenCalledWith([Constants.SESSION_ENDED_ROUTE], { queryParams: { reason: 'security' } });
        });

        it('does not explain a later ordinary sign-out with an old note', async () => {
            const navigate = vi.spyOn(router, 'navigate');
            signIn(true);

            localStorage.setItem(Constants.SESSION_ENDED_KEY, JSON.stringify({ reason: 'security', at: Date.now() - 60_000 }));
            localStorage.removeItem(Constants.AUTH_STORE_KEY);
            otherTabWrote(null);
            await settle();

            expect(navigate).toHaveBeenCalledWith([Constants.LOGIN_ROUTE], {});
        });

        it('carries on when another tab only renewed the same session', () => {
            signIn(true);

            const renewed = JSON.stringify({ transport: 'body', refresh_token: 'refresh-2', session_id: 'session-1', remember: true });
            localStorage.setItem(Constants.AUTH_STORE_KEY, renewed);
            otherTabWrote(renewed);

            expect(auth.isAuthenticated()).toBe(true);
            expect(auth.getAccessToken()).toBe('access-1');
        });
    });

    describe('signed-in devices', () => {
        it('lists the devices signed in to this account', () => {
            signIn(true);
            let devices: unknown;

            auth.listSessions().subscribe((list) => (devices = list));
            const request = backend.expectOne((r) => r.url.includes(APIEndpoint.GET_SESSIONS));
            expect(request.request.method).toBe('GET');
            request.flush({ code: 200, data: [{ id: 'session-1', current: true }] });

            expect(devices).toEqual([{ id: 'session-1', current: true }]);
        });

        it('signs out one other device by its id, and stays signed in here', () => {
            signIn(true);

            auth.signOutSession('session-2').subscribe();
            const request = backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT_SESSION));
            expect(request.request.body).toEqual({ session_id: 'session-2' });
            request.flush({ code: 200, data: { session_id: 'session-2' } });

            expect(auth.isAuthenticated()).toBe(true);
        });

        it('signs out every other device and keeps this one', () => {
            signIn(true);
            let closed = 0;

            auth.signOutOtherDevices().subscribe((n) => (closed = n));
            const request = backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT_EVERYWHERE));
            expect(request.request.body).toEqual({ keep_current: true });
            request.flush({ code: 200, data: { sessions_closed: 2 } });

            expect(closed).toBe(2);
            expect(auth.isAuthenticated()).toBe(true);
            expect(stored()).not.toBeNull();
        });
    });
});
