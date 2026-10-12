import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MenuItem } from '@app/core/models/session.model';
import { SessionService } from '@app/core/services/session/session.service';

/** The first page in menu order under `prefix` that the person may open, or null. */
export const firstOpenRoute = (menu: readonly MenuItem[], prefix = '/app/'): string | null => {
    for (const item of menu) {
        if (item.route && !item.isDisabled && item.route.startsWith(prefix)) return item.route;
        const child = firstOpenRoute(item.children, prefix);
        if (child) return child;
    }
    return null;
};

/**
 * A module's own address (/app/sales) is not a page: it opens the module's first page in menu
 * order that the person may open. The server has already filtered the menu by permission, so this
 * never lands on a closed route. A module with nothing open to them shows the not-found page.
 */
export const firstChildGuard: CanActivateFn = (_route, state) => {
    const router = inject(Router);
    const session = inject(SessionService);
    if (!session.loaded()) return false;
    const module = state.url.split(/[?#]/)[0].replace(/\/+$/, '');
    return router.parseUrl(firstOpenRoute(session.menu(), `${module}/`) ?? '/app/not-found');
};
