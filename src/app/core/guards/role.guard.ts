import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { Constants } from '../constants/constants';

export const RoleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'];
  if (authService.currentUserRole) {
    const rolesMatched = allowedRoles.map(
      (role: string) => role == authService.currentUserRole
    );
    if (rolesMatched.includes(true)) {
      return true;
    }
    router.navigate([Constants.LOGIN_ROUTE]);
    return false;
  } else {
    return true;
  }
};
