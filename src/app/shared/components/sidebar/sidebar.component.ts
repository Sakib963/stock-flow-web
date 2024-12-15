import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { SessionService } from '@app/core/services/session.service';
import { Menu } from '@app/core/constants/menu';
import { Router, RouterLink } from '@angular/router';
import { ROLES } from '@app/core/constants/constants';
import { AngularSvgIconModule } from 'angular-svg-icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, AngularSvgIconModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  userRole: string = '';
  menu: any = [];

  constructor(private _authService: AuthService, private _router: Router) {}

  ngOnInit(): void {
    this.userRole = this._authService.currentUserRole;

    if (this.userRole === ROLES.ADMIN) {
      this.menu = Menu.adminPages;
    } else if (this.userRole === ROLES.MANAGER) {
      this.menu = Menu.managerPages;
    } else {
      this.menu = Menu.defaultPages;
    }
  }

  isActive(route: string): boolean {
    if (route === '/') {
      return this._router.url === '/';
    }
    return this._router.url.startsWith(route);
  }

  handleClick(): any {
    this.actionEmitter.emit({ action: 'menu_click', value: null });
  }
}
