import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuthService } from 'src/app/modules/auth/services/auth.service';

export const UserInfoResolver: ResolveFn<any> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
  authService: AuthService = inject(AuthService)
): Observable<any> =>
  authService.getUserInfo().pipe(
    tap((res: any) => {
      authService._userInfo.set({
        role: res.data.role || '',
        name: res.data.name || '',
        email: res.data.email || '',
      });
    }),
    catchError((err) => {
      // authService.logout()
      return throwError(() => err);
    })
  );
