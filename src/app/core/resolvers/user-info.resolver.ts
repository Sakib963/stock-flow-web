import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
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
        photo: res.data.photo || '',
        mobile_number: res.data.mobile_number || '',
        designation: res.data.designation || '',
      });
    }),
    finalize(() => {
      authService.loading.set(false);
    }),
    catchError((err) => {
      authService.loading.set(false);
      return throwError(() => err);
    })
  );
