import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionPayload } from '@app/core/models/session.model';
import { SessionService } from '@app/core/services/session/session.service';
import { permissionGuard } from './permission.guard';

const payload = (permissions: string[]): SessionPayload => ({
    version: 'v1',
    user: { name: 'Samiha', email: 'owner@shop.com', mobile_number: null, photo: null, designation: null, role: 'Staff' },
    business: { name: 'Samiha Style Studio', logoUrl: null, orderSystem: 'both' },
    permissions,
    menu: [],
    counters: { notifications: 0 },
});

const run = (permission?: string) => {
    const route = { data: permission ? { permission } : {} } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => permissionGuard(route, { url: '/app/dashboard' } as RouterStateSnapshot));
};

describe('permissionGuard', () => {
    let session: SessionService;

    const load = (data: SessionPayload) => {
        const pending = session.load('token');
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_USER_INFO))
            .flush({ code: 200, data });
        return pending;
    };

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService({ fallbackLang: 'en' })],
        });
        session = TestBed.inject(SessionService);
    });

    afterEach(() => localStorage.clear());

    it('lets a held permission through', async () => {
        await load(payload(['dashboard.overview.view']));

        expect(run('dashboard.overview.view')).toBe(true);
    });

    it('lets an unguarded route through', async () => {
        await load(payload([]));

        expect(run()).toBe(true);
    });

    /**
     * The freeze this guard used to cause: a refusal redirected to the landing route, the landing
     * route redirects to this same guarded page, and the router span between them forever. Only a
     * plain refusal terminates.
     */
    it('cancels a refusal instead of redirecting', async () => {
        await load(payload(['sales.order.view']));

        expect(run('dashboard.overview.view')).toBe(false);
    });

    it('cancels when the payload never loaded, rather than bouncing to a guarded route', () => {
        expect(session.loaded()).toBe(false);
        expect(run('dashboard.overview.view')).toBe(false);
    });
});
