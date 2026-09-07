import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { AuthService } from '@app/core/services/auth.service';
import { tokenInterceptor } from './token.interceptor';

const stored = () => JSON.parse(localStorage.getItem(Constants.AUTH_STORE_KEY) ?? sessionStorage.getItem(Constants.AUTH_STORE_KEY) ?? '{}');

describe('tokenInterceptor', () => {
    let http: HttpClient;
    let backend: HttpTestingController;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ access_token: 'expired', refresh_token: 'refresh-1' }));

        TestBed.configureTestingModule({
            providers: [provideHttpClient(withInterceptors([tokenInterceptor])), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }])],
        });

        http = TestBed.inject(HttpClient);
        backend = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('attaches the stored token', () => {
        http.get('/api/v1/inventory/product').subscribe();

        expect(backend.expectOne('/api/v1/inventory/product').request.headers.get('Authorization')).toBe('Bearer expired');
    });

    /** The whole point: a 30-minute access token must not end a 7-day session. */
    it('renews once on a 401 and replays the request with the new token', async () => {
        const answer = new Promise((resolve) => http.get<{ ok: boolean }>('/api/v1/inventory/product').subscribe(resolve));

        backend.expectOne('/api/v1/inventory/product').flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

        const renewal = backend.expectOne((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN));
        expect(renewal.request.body).toEqual({ refresh_token: 'refresh-1' });
        renewal.flush({ code: 200, data: { access_token: 'fresh', refresh_token: 'refresh-1' } });

        const replay = backend.expectOne('/api/v1/inventory/product');
        expect(replay.request.headers.get('Authorization')).toBe('Bearer fresh');
        replay.flush({ ok: true });

        expect(await answer).toEqual({ ok: true });
        expect(stored().access_token).toBe('fresh');
    });

    /** Five requests in flight when the token dies must spend the refresh token once, not five times. */
    it('shares one renewal across requests that all fail at the same time', async () => {
        const first = new Promise((resolve) => http.get('/api/v1/a').subscribe(resolve));
        const second = new Promise((resolve) => http.get('/api/v1/b').subscribe(resolve));

        backend.expectOne('/api/v1/a').flush({}, { status: 401, statusText: 'Unauthorized' });
        backend.expectOne('/api/v1/b').flush({}, { status: 401, statusText: 'Unauthorized' });

        backend
            .match((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN))
            .forEach((renewal, index) => {
                expect(index).toBe(0);
                renewal.flush({ code: 200, data: { access_token: 'fresh', refresh_token: 'refresh-1' } });
            });

        backend.expectOne('/api/v1/a').flush({ from: 'a' });
        backend.expectOne('/api/v1/b').flush({ from: 'b' });

        expect(await first).toEqual({ from: 'a' });
        expect(await second).toEqual({ from: 'b' });
    });

    it('ends the session when the renewal itself is refused', async () => {
        const failed = new Promise<number>((resolve) => http.get('/api/v1/inventory/product').subscribe({ error: (e) => resolve(e.status) }));

        backend.expectOne('/api/v1/inventory/product').flush({}, { status: 401, statusText: 'Unauthorized' });
        backend.expectOne((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN)).flush({ message: 'This session was signed out.' }, { status: 401, statusText: 'Unauthorized' });

        expect(await failed).toBe(401);
        expect(TestBed.inject(AuthService).getAccessToken()).toBe('');
    });

    /** A replay that fails again is the end of it. Retrying a retry is how a login page melts. */
    it('does not renew twice for one request', async () => {
        const failed = new Promise<number>((resolve) => http.get('/api/v1/inventory/product').subscribe({ error: (e) => resolve(e.status) }));

        backend.expectOne('/api/v1/inventory/product').flush({}, { status: 401, statusText: 'Unauthorized' });
        backend.expectOne((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN)).flush({ code: 200, data: { access_token: 'fresh', refresh_token: 'refresh-1' } });
        backend.expectOne('/api/v1/inventory/product').flush({}, { status: 401, statusText: 'Unauthorized' });

        expect(await failed).toBe(401);
        backend.expectNone((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN));
    });

    it('leaves a rejected sign-in alone', async () => {
        const failed = new Promise<number>((resolve) => http.post(APIEndpoint.SIGN_IN, { email: 'a@b.com', password: 'wrong' }).subscribe({ error: (e) => resolve(e.status) }));

        const attempt = backend.expectOne(APIEndpoint.SIGN_IN);
        expect(attempt.request.headers.has('Authorization')).toBe(false);
        attempt.flush({ message: 'Password did not match' }, { status: 401, statusText: 'Unauthorized' });

        expect(await failed).toBe(401);
        backend.expectNone((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN));
        expect(stored().access_token).toBe('expired');
    });

    /** Renewing on the way out would hand back the tokens the server was just told to close. */
    it('does not renew for a sign-out', async () => {
        const failed = new Promise<number>((resolve) => http.post(APIEndpoint.SIGN_OUT, {}).subscribe({ error: (e) => resolve(e.status) }));

        backend.expectOne(APIEndpoint.SIGN_OUT).flush({}, { status: 401, statusText: 'Unauthorized' });

        expect(await failed).toBe(401);
        backend.expectNone((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN));
    });
});
