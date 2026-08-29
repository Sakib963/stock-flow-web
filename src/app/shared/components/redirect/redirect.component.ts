import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { Router } from '@angular/router';
import { ROLES } from '@app/core/constants/constants';
import { LoaderComponent } from '../loader/loader.component';

@Component({
    selector: 'app-redirect',
    imports: [CommonModule, LoaderComponent],
    templateUrl: './redirect.component.html',
    styleUrls: ['./redirect.component.scss'],
})
export class RedirectComponent implements OnInit {
    private hasRedirected = false;

    constructor(
        private _authService: AuthService,
        private _router: Router
    ) {
        // Use effect to watch for userInfo signal changes
        effect(() => {
            const userInfo = this._authService._userInfo();
            const role = userInfo?.role;

            // Only redirect once when role is available
            if (role && !this.hasRedirected) {
                this.hasRedirected = true;
                this.performRedirect(role);
            }
        });
    }

    ngOnInit(): void {
        // Check immediately on init in case userInfo is already loaded
        const role = this._authService.currentUserRole;
        if (role && !this.hasRedirected) {
            this.hasRedirected = true;
            this.performRedirect(role);
        }
    }

    // Landing route per role. Every destination is a revamp route: the legacy
    // /manager/dashboard and /sales/quick-sale targets were deleted with the rest
    // of the old generation.
    private performRedirect(role: string): void {
        if (role === ROLES.ADMIN) {
            this._router.navigate(['/admin/dashboard']);
        } else if (role === ROLES.MANAGER || role === ROLES.GUEST) {
            this._router.navigate(['/configuration/stats']);
        } else if (role === ROLES.SALESMAN) {
            this._router.navigate(['/sales/pos']);
        }
    }
}
