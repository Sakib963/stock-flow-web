import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { Router } from '@angular/router';
import { ROLES } from '@app/core/constants/constants';

@Component({
  selector: 'app-redirect',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './redirect.component.html',
  styleUrls: ['./redirect.component.scss'],
})
export class RedirectComponent implements OnInit {
  constructor(private _authService: AuthService, private _router: Router) {}

  ngOnInit(): void {
    if (this._authService.currentUserRole === ROLES.ADMIN) {
      this._router.navigate(['/admin/dashboard']);
    } else if (this._authService.currentUserRole === ROLES.MANAGER) {
      this._router.navigate(['/manager/dashboard']);
    }
  }
}
