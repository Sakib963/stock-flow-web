import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { SessionService } from '@app/core/services/session/session.service';

/**
 * Closes a route the signed-in person may not reach.
 *
 * The permission comes from the route's own data, so a deep link is refused the same way the menu
 * item is hidden. This is UX, not security: the endpoint behind the page checks the same code.
 *
 * A refusal cancels the navigation rather than redirecting anywhere. It used to redirect to the
 * landing route, which froze the tab: the landing route redirects to the dashboard, the dashboard
 * is guarded by this function, and the two bounced off each other forever. Every candidate target
 * has that problem, because a route that exists is guarded and a route that does not falls through
 * the wildcard back to the landing route. Cancelling is the only answer that terminates, and it
 * leaves the person on the page they were already looking at.
 */
export const permissionGuard: CanActivateFn = (route) => {
    const session = inject(SessionService);

    const required = route.data?.['permission'] as string | undefined;
    if (!required) return true;

    // The shell route loads the payload before any child activates, so an empty session here means
    // that load failed and a sign-out is already on its way.
    if (!session.loaded()) return false;

    return session.can(required);
};
