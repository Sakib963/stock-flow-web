import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { AuthService } from './auth.service';

const inLocal = () => localStorage.getItem(Constants.AUTH_STORE_KEY);
const inSession = () => sessionStorage.getItem(Constants.AUTH_STORE_KEY);

describe('AuthService', () => {
    let auth: AuthService;
    let backend: HttpTestingController;

    const signIn = (remember: boolean) => {
        auth.login({ email: 'owner@shop.com', password: 'correct', remember }).subscribe();
        backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).flush({ code: 200, message: 'ok', data: { access_token: 'access-1', refresh_token: 'refresh-1' } });
    };

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }])],
        });
        auth = TestBed.inject(AuthService);
        backend = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('sends only the credentials to the server', () => {
        auth.login({ email: 'owner@shop.com', password: 'correct', remember: false }).subscribe();

        expect(backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).request.body).toEqual({ email: 'owner@shop.com', password: 'correct' });
    });

    /** "Keep me signed in" was a checkbox that did nothing. Checked, the machine remembers. */
    it('keeps the session on the machine when asked to', () => {
        signIn(true);

        expect(inLocal()).not.toBeNull();
        expect(inSession()).toBeNull();
        expect(auth.getAccessToken()).toBe('access-1');
    });

    /** Unchecked, the session belongs to the tab and dies with it. */
    it('keeps the session in the tab when not asked to', () => {
        signIn(false);

        expect(inSession()).not.toBeNull();
        expect(inLocal()).toBeNull();
        expect(auth.getAccessToken()).toBe('access-1');
    });

    it('identifies the session by the refresh token, which outlives a renewal', () => {
        signIn(true);
        expect(auth.sessionKey()).toBe('refresh-1');

        auth.renewAccessToken().subscribe();
        backend.expectOne((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN)).flush({ code: 200, data: { access_token: 'access-2', refresh_token: 'refresh-1' } });

        expect(auth.getAccessToken()).toBe('access-2');
        expect(auth.sessionKey()).toBe('refresh-1');
    });

    /** A renewal must not move a tab-only session into the machine's permanent storage. */
    it('renews into the same storage the person chose', () => {
        signIn(false);

        auth.renewAccessToken().subscribe();
        backend.expectOne((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN)).flush({ code: 200, data: { access_token: 'access-2', refresh_token: 'refresh-1' } });

        expect(inLocal()).toBeNull();
        expect(JSON.parse(inSession() ?? '{}').access_token).toBe('access-2');
    });

    /** The reason this exists: the database has to learn the token is dead. */
    it('tells the server to close the session on sign out', () => {
        signIn(true);

        auth.signOut();

        expect(backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT)).request.body).toEqual({ refresh_token: 'refresh-1' });
        expect(inLocal()).toBeNull();
        expect(inSession()).toBeNull();
        expect(auth.isAuthenticated()).toBe(false);
    });

    /** The person leaves either way. A counter machine with no network still has to lock. */
    it('forgets the session even when the server cannot be reached', () => {
        signIn(true);

        auth.signOut();
        backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT)).error(new ProgressEvent('error'), { status: 0 });

        expect(inLocal()).toBeNull();
        expect(auth.getAccessToken()).toBe('');
    });

    it('does not call the server when there is nothing to close', () => {
        auth.signOut();

        backend.expectNone((r) => r.url.includes(APIEndpoint.SIGN_OUT));
    });

    it('ends the session when there is no refresh token to renew with', async () => {
        localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ access_token: 'access-1' }));

        const failed = new Promise<boolean>((resolve) => auth.renewAccessToken().subscribe({ error: () => resolve(true) }));

        expect(await failed).toBe(true);
        expect(inLocal()).toBeNull();
        backend.expectNone((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN));
    });
});
