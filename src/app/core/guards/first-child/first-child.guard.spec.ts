import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { MenuItem } from '@app/core/models/session.model';
import { SessionService } from '@app/core/services/session/session.service';
import { firstChildGuard, firstOpenRoute } from './first-child.guard';

const item = (route: string | null, children: MenuItem[] = [], isDisabled = false): MenuItem => ({ id: route ?? 'group', label: { en: '', bn: '' }, description: { en: null, bn: null }, tags: [], icon: null, order: 0, route, permission: null, isDisabled, disabledMessage: { en: null, bn: null }, isNew: false, children }) as MenuItem;

// As the server sends it: already filtered to what this person may open, in menu order.
const MENU = [item('/app/dashboard'), item(null, [item('/app/sales/pos', [], true), item('/app/sales/orders'), item('/app/sales/delivery-batches')]), item(null, [item('/app/inventory/purchase-orders')])];

const run = (url: string, menu = MENU, loaded = true) => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: SessionService, useValue: { loaded: () => loaded, menu: () => menu } }] });
    const result = TestBed.runInInjectionContext(() => firstChildGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
};

describe('firstChildGuard', () => {
    it('opens the first page of the module the person may open, skipping one not ready yet', () => {
        expect(run('/app/sales')).toBe('/app/sales/orders');
        TestBed.resetTestingModule();
        expect(run('/app/inventory/')).toBe('/app/inventory/purchase-orders');
    });

    it('shows the not-found page for a module with nothing open to the person', () => {
        expect(run('/app/configuration')).toBe('/app/not-found');
    });

    it('lets nothing through before the session has loaded', () => {
        expect(run('/app/sales', MENU, false)).toBe(false);
    });

    it('finds the first page anywhere in the menu for the way out of the not-found page', () => {
        expect(firstOpenRoute(MENU)).toBe('/app/dashboard');
        expect(firstOpenRoute([])).toBeNull();
    });
});
