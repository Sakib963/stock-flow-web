import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { SessionPayload } from '@app/core/models/session.model';
import { tokenInterceptor } from '@app/core/interceptors/token.interceptor';
import { AuthService } from '@app/core/services/auth.service';
import { SessionService } from '@app/core/services/session.service';
import { sessionGuard } from './session.guard';

const payload = (name: string): SessionPayload => ({
    version: 'v1',
    user: { name, email: `${name}@shop.com`, mobile_number: null, photo: null, designation: null, role: 'Owner' },
    business: { name: 'Samiha Style Studio', logoUrl: null, orderSystem: 'both' },
    permissions: ['dashboard.overview.view'],
    menu: [],
    counters: { notifications: 0 },
});

/** The refresh token is the session key: it survives a renewal and changes only at sign-in. */
const storeSession = (key: string, access = `access-${key}`) => localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ access_token: access, refresh_token: key }));

const activate = () => TestBed.runInInjectionContext(() => sessionGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as Promise<boolean>;

describe('sessionGuard', () => {
    let session: SessionService;
    let http: HttpTestingController;

    const flush = (name: string) => http.expectOne((r) => r.url.includes(APIEndpoint.GET_USER_INFO)).flush({ code: 200, data: payload(name) });

    beforeEach(() => {
        localStorage.clear();
        storeSession('session-a');
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }]), provideTranslateService({ fallbackLang: 'en' })],
        });
        session = TestBed.inject(SessionService);
        http = TestBed.inject(HttpTestingController);
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

        storeSession('session-b');
        const second = activate();
        flush('Rafi');

        expect(await second).toBe(true);
        expect(session.user()?.name).toBe('Rafi');
    });

    /** Renewing the access token every 30 minutes must not refetch a menu that has not changed. */
    it('does not refetch when only the access token was renewed', async () => {
        const first = activate();
        flush('Samiha');
        await first;

        storeSession('session-a', 'access-renewed');

        expect(await activate()).toBe(true);
        http.expectNone((r) => r.url.includes(APIEndpoint.GET_USER_INFO));
    });

    it('signs out when the payload cannot be fetched, so the login page will not bounce back', async () => {
        const result = activate();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_USER_INFO)).flush({ code: 500, message: 'nope' }, { status: 500, statusText: 'Server Error' });

        expect(await result).toBe(false);
        expect(TestBed.inject(AuthService).getAccessToken()).toBe('');
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
