import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionPayload } from '@app/core/models/session.model';
import { tokenInterceptor } from '@app/core/interceptors/token.interceptor';
import { AuthService } from '@app/core/services/auth/auth.service';
import { SessionService } from '@app/core/services/session/session.service';
import { sessionGuard } from './session.guard';

const payload = (name: string): SessionPayload => ({
    version: 'v1',
    user: { name, email: `${name}@shop.com`, mobile_number: null, photo: null, designation: null, role: 'Owner' },
    business: { name: 'Samiha Style Studio', logoUrl: null, orderSystem: 'both' },
    permissions: ['dashboard.overview.view'],
    menu: [],
    counters: { notifications: 0 },
});

const grant = (sessionId: string, access = `access-${sessionId}`) => ({ access_token: access, expires_in: 900, session_id: sessionId, refresh_transport: 'cookie' });
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const activate = () => TestBed.runInInjectionContext(() => sessionGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as Promise<boolean>;

describe('sessionGuard', () => {
    let auth: AuthService;
    let session: SessionService;
    let http: HttpTestingController;

    /** The session id is the key: it survives a renewal and changes only at sign-in. */
    const signIn = (sessionId: string) => {
        auth.login({ email: 'owner@shop.com', password: 'correct', remember: true }).subscribe();
        http.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).flush({ code: 200, data: { ...grant(sessionId), user: { id: 'u1', email: 'owner@shop.com', name: 'Samiha', role: 'Owner' } } });
    };

    const flush = (name: string) => http.expectOne((r) => r.url.includes(APIEndpoint.GET_USER_INFO)).flush({ code: 200, data: payload(name) });

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }]), provideTranslateService({ fallbackLang: 'en' })],
        });
        auth = TestBed.inject(AuthService);
        session = TestBed.inject(SessionService);
        http = TestBed.inject(HttpTestingController);
        signIn('session-a');
    });

    afterEach(() => localStorage.clear());

    /** Signing in does not reload the page, so this is the only thing that fetches the payload. */
    it('loads the boot payload before the shell activates', async () => {
        const result = activate();
        flush('Samiha');

        expect(await result).toBe(true);
        expect(session.loaded()).toBe(true);
    });

    it('does not fetch again for the same signed-in person', async () => {
        const first = activate();
        flush('Samiha');
        await first;

        expect(await activate()).toBe(true);
        http.expectNone((r) => r.url.includes(APIEndpoint.GET_USER_INFO));
    });

    /** Two people share the counter machine. The second must not inherit the first one's menu. */
    it('refetches when a different person signs in on the same machine', async () => {
        const first = activate();
        flush('Samiha');
        await first;

        signIn('session-b');
        const second = activate();
        flush('Rafi');

        expect(await second).toBe(true);
        expect(session.user()?.name).toBe('Rafi');
    });

    /** Renewing the access token every 15 minutes must not refetch a menu that has not changed. */
    it('does not refetch when only the access token was renewed', async () => {
        const first = activate();
        flush('Samiha');
        await first;

        auth.renewAccessToken().subscribe();
        await settle();
        http.expectOne((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN)).flush({ code: 200, data: grant('session-a', 'access-renewed') });

        expect(await activate()).toBe(true);
        http.expectNone((r) => r.url.includes(APIEndpoint.GET_USER_INFO));
    });

    it('signs out when the payload cannot be fetched, so the login page will not bounce back', async () => {
        const result = activate();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_USER_INFO)).flush({ code: 500, message: 'nope' }, { status: 500, statusText: 'Server Error' });

        expect(await result).toBe(false);
        expect(auth.isAuthenticated()).toBe(false);
        expect(auth.getAccessToken()).toBe('');
        expect(session.loaded()).toBe(false);
    });
});

/**
 * The token interceptor injects AuthService, and the translation files are fetched through that
 * interceptor while LanguageService is still being constructed. So anything AuthService injects is
 * part of a ring: giving it SessionService, which reaches LanguageService, made Angular refuse to
 * construct the graph at boot with NG0200 and left the app on its loading skeleton.
 *
 * No TranslateService is provided here on purpose. If AuthService ever reaches LanguageService
 * again, this fails while constructing it, rather than in the browser after a deploy.
 */
describe('AuthService dependencies', () => {
    it('constructs without pulling in the services that fetch through the interceptor', () => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withInterceptors([tokenInterceptor])), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }])],
        });

        expect(() => TestBed.inject(AuthService)).not.toThrow();
    });
});
