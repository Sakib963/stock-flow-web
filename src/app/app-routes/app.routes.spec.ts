import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { routes } from './app.routes';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { SessionPayload } from '@app/core/models/session.model';
import { AuthService } from '@app/core/services/auth.service';

const payload = (permissions: string[]): SessionPayload => ({
    version: 'v1',
    user: { name: 'Samiha', email: 'owner@shop.com', mobile_number: null, photo: null, designation: null, role: 'Owner' },
    business: { name: 'Samiha Style Studio', logoUrl: null, orderSystem: 'both' },
    permissions,
    menu: [],
    counters: { notifications: 0 },
});

/**
 * Signing in navigates into the shell without reloading the page, and that is the path that hung:
 * nothing had fetched the boot payload, so the permission guard refused the dashboard and sent the
 * router to a route that redirects straight back to the dashboard, forever. These tests navigate
 * the real route table, so a return of that loop shows up as a navigation that never settles.
 */
describe('shell routing after sign-in', () => {
    let router: Router;
    let http: HttpTestingController;

    /** The payload request is fired from inside the guard, so it appears a few microtasks in. */
    const flushBootPayload = async (permissions: string[]) => {
        for (let attempt = 0; attempt < 50; attempt++) {
            const open = http.match((r) => r.url.includes(APIEndpoint.GET_USER_INFO));
            if (open.length) return open[0].flush({ code: 200, data: payload(permissions) });
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error('the boot payload was never requested');
    };

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes), provideTranslateService({ fallbackLang: 'en' })],
        });
        router = TestBed.inject(Router);
        http = TestBed.inject(HttpTestingController);

        TestBed.inject(AuthService).login({ email: 'owner@shop.com', password: 'secret', remember: true }).subscribe();
        http.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).flush({
            code: 200,
            data: { access_token: 'token', expires_in: 900, session_id: 'session-1', refresh_transport: 'cookie', user: { id: 'u1', email: 'owner@shop.com', name: 'Samiha', role: 'Owner' } },
        });
    });

    afterEach(() => localStorage.clear());

    it('reaches the dashboard, fetching the payload on the way in', async () => {
        const navigation = router.navigateByUrl('/app/dashboard');
        await flushBootPayload(['dashboard.overview.view']);

        expect(await navigation).toBe(true);
        expect(router.url).toBe('/app/dashboard');
    });

    it('reaches the dashboard through the landing route as well', async () => {
        const navigation = router.navigateByUrl(Constants.APP_ROUTE);
        await flushBootPayload(['dashboard.overview.view']);

        expect(await navigation).toBe(true);
        expect(router.url).toBe('/app/dashboard');
    });

    it('stops instead of spinning when the landing page itself is refused', async () => {
        const navigation = router.navigateByUrl(Constants.APP_ROUTE);
        await flushBootPayload(['sales.order.view']);

        expect(await navigation).toBe(false);
        expect(router.url).not.toContain('/app/dashboard');
    });
});
