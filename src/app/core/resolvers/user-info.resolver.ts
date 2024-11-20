import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from 'src/app/modules/auth/services/auth.service';

export const UserInfoResolver: ResolveFn<any> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
  authService: AuthService = inject(AuthService)
): Observable<any> =>
  authService.getUserInfo().pipe(
    catchError((err) => {
      return throwError(() => err);
    })
  );
