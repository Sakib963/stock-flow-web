import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { routes } from './app.routes';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { SessionPayload } from '@app/core/models/session.model';
import { AuthService } from '@app/core/services/auth/auth.service';

const payload = (permissions: string[], menu: SessionPayload['menu'] = []): SessionPayload => ({
    version: 'v1',
    user: { name: 'Test', email: 'owner@shop.com', mobile_number: null, photo: null, designation: null, role: 'Owner' },
    business: { name: 'Arithma Labs', logoUrl: null, orderSystem: 'both', timeZone: 'Asia/Dhaka' },
    permissions,
    menu,
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

    /** The payload request is fired from inside the guard, after the lazy route has loaded: on a busy
     * machine that can take seconds, so the wait is long and ends as soon as the request appears. */
    const flushBootPayload = async (permissions: string[], menu: SessionPayload['menu'] = []) => {
        for (let attempt = 0; attempt < 500; attempt++) {
            const open = http.match((r) => r.url.includes(APIEndpoint.GET_USER_INFO));
            if (open.length) return open[0].flush({ code: 200, data: payload(permissions, menu) });
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
            data: { access_token: 'token', expires_in: 900, session_id: 'session-1', refresh_transport: 'cookie', user: { id: 'u1', email: 'owner@shop.com', name: 'Test', role: 'Owner' } },
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

    it('shows the not-found page for an address that is no page, inside the shell or a module', async () => {
        const navigation = router.navigateByUrl('/app/nowhere');
        await flushBootPayload(['dashboard.overview.view']);
        expect(await navigation).toBe(true);
        expect(router.url).toBe('/app/nowhere');
        expect(router.routerState.snapshot.root.firstChild?.firstChild?.routeConfig?.path).toBe('**');

        expect(await router.navigateByUrl('/app/sales/nowhere')).toBe(true);
        expect(router.routerState.snapshot.root.firstChild?.firstChild?.routeConfig?.path).toBe('**');
    });

    it('opens a module address at its first page the person may open', async () => {
        const orders = { id: 'sales-orders', label: { en: 'Orders', bn: 'অর্ডার' }, description: { en: null, bn: null }, tags: [], icon: null, order: 1, route: '/app/sales/orders', permission: 'sales.order.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] };
        const group = { ...orders, id: 'sales', route: null, permission: null, children: [orders] };
        const navigation = router.navigateByUrl('/app/sales');
        await flushBootPayload(['sales.order.view'], [group]);
        await navigation;
        expect(router.url).toBe('/app/sales/orders');
    });

    it('opens change password with what it needs to ask before sending, so the page is never left empty', async () => {
        const navigation = router.navigateByUrl('/app/change-password');
        await flushBootPayload(['dashboard.overview.view']);
        expect(await navigation).toBe(true);
        expect(router.url).toBe('/app/change-password');
    });

    it('opens the business settings page with what it needs to ask before saving', async () => {
        const navigation = router.navigateByUrl('/app/settings');
        await flushBootPayload(['settings.business.view', 'settings.business.edit']);
        expect(await navigation).toBe(true);
        expect(router.url).toBe('/app/settings');
    });
});
