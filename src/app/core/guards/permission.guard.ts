import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '@app/core/services/session.service';
import { Constants } from '@app/core/constants/constants';

/**
 * Closes a route the signed-in person may not reach.
 *
 * The permission comes from the route's own data, so a deep link is refused the same way the menu
 * item is hidden. This is UX, not security: the endpoint behind the page checks the same code.
 *
 * Usage: { path: 'orders', canActivate: [authGuard, permissionGuard], data: { permission: 'sales.order.view' } }
 */
export const permissionGuard: CanActivateFn = (route) => {
    const session = inject(SessionService);
    const router = inject(Router);

    const required = route.data?.['permission'] as string | undefined;
    if (!required) return true;

    // Nothing loaded means the boot call has not run, which is a routing mistake rather than a
    // denial. Send them to the landing route and let the initializer do its job.
    if (!session.loaded()) return router.createUrlTree([Constants.APP_ROUTE]);

    return session.can(required) ? true : router.createUrlTree([Constants.APP_ROUTE]);
};
