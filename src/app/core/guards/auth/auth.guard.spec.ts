import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { AuthService } from '@app/core/services/auth/auth.service';
import { authGuard } from './auth.guard';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('authGuard', () => {
    let auth: AuthService;
    let http: HttpTestingController;
    let router: Router;

    const activate = () => router.serializeUrl(TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/app/dashboard' } as RouterStateSnapshot)) as UrlTree);

    const refusedAtStart = async (data: object) => {
        localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ transport: 'cookie', session_id: 'session-1', remember: true }));
        const restored = auth.restore();
        await settle();
        http.expectOne((r) => r.url.includes(APIEndpoint.REFRESH_TOKEN)).flush({ code: 401, data }, { status: 401, statusText: 'Unauthorized' });
        await restored;
    };

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }])],
        });
        auth = TestBed.inject(AuthService);
        http = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
    });

    afterEach(() => localStorage.clear());

    it('sends someone with no session to sign in, remembering where they were headed', async () => {
        await auth.restore();

        expect(activate()).toBe('/auth/login?origUrl=%2Fapp%2Fdashboard');
    });

    /** Coming back to a device whose session was ended while it sat unused. */
    it('explains why a stored session was refused instead of showing a bare sign-in form', async () => {
        await refusedAtStart({ reason: 'ended', ended_reason: 'RemoteSignOut' });

        expect(activate()).toBe('/auth/session-ended?reason=signed-out-elsewhere&origUrl=%2Fapp%2Fdashboard');
    });

    it('explains it once, so a later visit is an ordinary sign-in', async () => {
        await refusedAtStart({ reason: 'expired', ended_reason: 'Expired' });

        activate();

        expect(activate()).toBe('/auth/login?origUrl=%2Fapp%2Fdashboard');
    });
});
