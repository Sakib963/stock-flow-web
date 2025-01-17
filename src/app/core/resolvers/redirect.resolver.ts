import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { Constants, ROLES } from '../constants/constants';

@Injectable({
  providedIn: 'root',
})
export class RedirectResolver implements Resolve<void> {
  constructor(private authService: AuthService, private router: Router) {}

  async resolve(): Promise<void> {
    const currentUrl = this.router.url; // Get the current URL
    console.log('Current URL:', currentUrl);

    // Only execute redirection for the root path
    if (currentUrl === '/') {
      const userRole = this.authService.currentUserRole; // Replace with your role-fetching logic
      console.log('Redirecting user based on role:', userRole);

      /* if (userRole === ROLES.ADMIN) {
        await this.router.navigate(['/admin']);
      } else if (userRole === ROLES.MANAGER) {
        await this.router.navigate(['/manager']);
      } else {
        await this.router.navigate(['/login']); // Handle unauthorized users
      } */
    }
  }
}
