import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { Router } from '@angular/router';
import { ROLES } from '@app/core/constants/constants';
import { LoaderComponent } from '../loader/loader.component';

@Component({
  selector: 'app-redirect',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  templateUrl: './redirect.component.html',
  styleUrls: ['./redirect.component.scss'],
})
export class RedirectComponent implements OnInit {
  constructor(private _authService: AuthService, private _router: Router) {}

  ngOnInit(): void {
    if (!this._authService.isLoading) {
      if (this._authService.currentUserRole === ROLES.ADMIN) {
        this._router.navigate(['/admin/dashboard']);
      } else if (this._authService.currentUserRole === ROLES.MANAGER || this._authService.currentUserRole === ROLES.GUEST) {
        this._router.navigate(['/manager/dashboard']);
      } else if (this._authService.currentUserRole === ROLES.SALESMAN) {
        this._router.navigate(['/sales/quick-sale']);
      }
    }
  }
}
