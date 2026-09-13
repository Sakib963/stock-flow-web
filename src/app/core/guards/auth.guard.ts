import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { Constants } from '@app/core/constants/constants';

/**
 * Keeps unauthenticated users out of the app, remembering where they were headed.
 *
 * A stored session the server refused at start-up is explained on the session-ended page rather
 * than met with a bare sign-in form: being signed out from another device reads very differently
 * from an ordinary expiry, and the person deserves to know which it was.
 */
export const authGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated()) return true;

    const reason = auth.takeEndedReason();
    if (reason) return router.createUrlTree([Constants.SESSION_ENDED_ROUTE], { queryParams: { reason, origUrl: state.url } });

    return router.createUrlTree([Constants.LOGIN_ROUTE], {
        queryParams: { origUrl: state.url },
    });
};

/** Keeps signed-in users off the login page, so returning to the tab lands in the app. */
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.isAuthenticated() ? router.createUrlTree([Constants.APP_ROUTE]) : true;
};
