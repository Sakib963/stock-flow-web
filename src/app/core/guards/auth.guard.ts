import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';


import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { Constants } from '../constants/constants';
import { SessionService } from '../services/session.service';

export const AuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const sessionService = inject(SessionService);
    const authService = inject(AuthService);
    const router = inject(Router);

    return sessionService.isLoggedIn().pipe(
        map(loggedIn => {
            return loggedIn
                ? true
                : router.createUrlTree([router.parseUrl(Constants.LOGIN_ROUTE)], {
                      queryParams: { origUrl: state.url }
                  });
        }),
        catchError(err => {
            authService.removeTokens();
            router.navigate([Constants.LOGIN_ROUTE], {
                queryParams: { origUrl: state.url }
            });
            return of(false);
        })
    );
};
