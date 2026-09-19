import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { AuthService } from '@app/core/services/auth/auth.service';
import { environment } from '@env/environment';
import { tokenInterceptor } from './token.interceptor';

const api = (path: string) => `${environment.baseUrl}/api/v1/${path}`;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const grant = (access: string, refresh: string) => ({ access_token: access, expires_in: 900, session_id: 'session-1', refresh_transport: 'body', refresh_token: refresh });
const isRenewal = (r: { url: string }) => r.url.includes(APIEndpoint.REFRESH_TOKEN);

describe('tokenInterceptor', () => {
    let http: HttpClient;
    let backend: HttpTestingController;
    let auth: AuthService;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withInterceptors([tokenInterceptor])), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }])],
        });

        http = TestBed.inject(HttpClient);
        backend = TestBed.inject(HttpTestingController);
        auth = TestBed.inject(AuthService);

        auth.login({ email: 'owner@shop.com', password: 'correct', remember: true }).subscribe();
        backend.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).flush({ code: 200, data: { ...grant('expired', 'refresh-1'), user: { id: 'u1', email: 'owner@shop.com', name: 'Samiha', role: 'Owner' } } });
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('attaches the token to API calls', () => {
        http.get(api('inventory/product')).subscribe();

        expect(backend.expectOne(api('inventory/product')).request.headers.get('Authorization')).toBe('Bearer expired');
    });

    it('keeps the token away from anything that is not the API', () => {
        http.get('assets/i18n/en.json').subscribe();
        http.post('https://api.cloudinary.com/v1_1/stockflow/image/upload', {}).subscribe();

        expect(backend.expectOne('assets/i18n/en.json').request.headers.has('Authorization')).toBe(false);
        expect(backend.expectOne('https://api.cloudinary.com/v1_1/stockflow/image/upload').request.headers.has('Authorization')).toBe(false);
    });

    /** The whole point: a 15-minute access token must not end a session that is still in use. */
    it('renews once on a 401 and replays the request with the new token', async () => {
        const answer = new Promise((resolve) => http.get(api('inventory/product')).subscribe(resolve));

        backend.expectOne(api('inventory/product')).flush({}, { status: 401, statusText: 'Unauthorized' });
        await settle();

        const renewal = backend.expectOne(isRenewal);
        expect(renewal.request.body).toEqual({ refresh_token: 'refresh-1' });
        renewal.flush({ code: 200, data: grant('fresh', 'refresh-2') });
        await settle();

        const replay = backend.expectOne(api('inventory/product'));
        expect(replay.request.headers.get('Authorization')).toBe('Bearer fresh');
        replay.flush({ ok: true });

        expect(await answer).toEqual({ ok: true });
    });

    /** Each renewal replaces the refresh token, so requests that fail together must share one. */
    it('shares one renewal across requests that all fail at the same time', async () => {
        const paths = ['orders', 'stock', 'returns'];
        const answers = paths.map((path) => new Promise((resolve) => http.get(api(path)).subscribe(resolve)));

        for (const path of paths) backend.expectOne(api(path)).flush({}, { status: 401, statusText: 'Unauthorized' });
        await settle();

        const renewals = backend.match(isRenewal);
        expect(renewals.length).toBe(1);
        renewals[0].flush({ code: 200, data: grant('fresh', 'refresh-2') });
        await settle();

        for (const path of paths) {
            const replay = backend.expectOne(api(path));
            expect(replay.request.headers.get('Authorization')).toBe('Bearer fresh');
            replay.flush({ from: path });
        }

        expect(await Promise.all(answers)).toEqual(paths.map((from) => ({ from })));
    });

    it('ends the session when the renewal itself is refused, and does not try again', async () => {
        const failed = new Promise<number>((resolve) => http.get(api('inventory/product')).subscribe({ error: (e) => resolve(e.status) }));

        backend.expectOne(api('inventory/product')).flush({}, { status: 401, statusText: 'Unauthorized' });
        await settle();
        backend.expectOne(isRenewal).flush({ code: 401 }, { status: 401, statusText: 'Unauthorized' });

        expect(await failed).toBe(401);
        expect(auth.isAuthenticated()).toBe(false);
        backend.expectNone(isRenewal);
    });

    it('keeps the session when the renewal cannot reach the server', async () => {
        const failed = new Promise<number>((resolve) => http.get(api('inventory/product')).subscribe({ error: (e) => resolve(e.status) }));

        backend.expectOne(api('inventory/product')).flush({}, { status: 401, statusText: 'Unauthorized' });
        await settle();
        backend.expectOne(isRenewal).error(new ProgressEvent('error'), { status: 0 });

        expect(await failed).toBe(0);
        expect(auth.isAuthenticated()).toBe(true);
    });

    /** A replay that fails again is the end of it. Retrying a retry is how a login page melts. */
    it('does not renew twice for one request', async () => {
        const failed = new Promise<number>((resolve) => http.get(api('inventory/product')).subscribe({ error: (e) => resolve(e.status) }));

        backend.expectOne(api('inventory/product')).flush({}, { status: 401, statusText: 'Unauthorized' });
        await settle();
        backend.expectOne(isRenewal).flush({ code: 200, data: grant('fresh', 'refresh-2') });
        await settle();
        backend.expectOne(api('inventory/product')).flush({}, { status: 401, statusText: 'Unauthorized' });

        expect(await failed).toBe(401);
        await settle();
        backend.expectNone(isRenewal);
    });

    it('leaves a rejected sign-in alone', async () => {
        const url = `${environment.baseUrl}${APIEndpoint.SIGN_IN}`;
        const failed = new Promise<number>((resolve) => http.post(url, { email: 'a@b.com', password: 'wrong' }).subscribe({ error: (e) => resolve(e.status) }));

        const attempt = backend.expectOne(url);
        expect(attempt.request.headers.has('Authorization')).toBe(false);
        attempt.flush({ message: 'Email or password is incorrect.' }, { status: 401, statusText: 'Unauthorized' });

        expect(await failed).toBe(401);
        backend.expectNone(isRenewal);
        expect(auth.isAuthenticated()).toBe(true);
    });

    /** Renewing on the way out would hand back a session the server was just told to close. */
    it('does not renew for a sign-out', async () => {
        const url = `${environment.baseUrl}${APIEndpoint.SIGN_OUT}`;
        const failed = new Promise<number>((resolve) => http.post(url, {}).subscribe({ error: (e) => resolve(e.status) }));

        backend.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });

        expect(await failed).toBe(401);
        backend.expectNone(isRenewal);
    });
});
