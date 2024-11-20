import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot
} from '@angular/router';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Constants } from '../constants/constants';

export const AuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn().pipe(
    map(loggedIn => loggedIn ? true : router.createUrlTree([router.parseUrl(Constants.LOGIN_ROUTE)], {
      queryParams: { origUrl: state.url }
    } )),
    catchError((err) => {
      router.navigate([Constants.LOGIN_ROUTE], {
        queryParams: { origUrl: state.url }
      });
      return of(false);
    })
  )
}
