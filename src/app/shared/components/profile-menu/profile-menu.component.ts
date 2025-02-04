import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NzNotificationService } from 'ng-zorro-antd/notification';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    AngularSvgIconModule,
  ],
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.scss'],
})
export class ProfileMenuComponent {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  notifications: any[] = [];
  userInfo: any;
  isDropdownOpen: boolean = false;

  constructor(
    private _authService: AuthService,
    private _notificationService: NzNotificationService
  ) {
    this.userInfo = this._authService.userInfo;
  }

  handleLogout() {
    this.actionEmitter.emit({ action: 'logout', value: null });
  }

  toggleNotifications(): void {
    console.log('toggleNotifications');
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  getFirstLetter(name: any): any {
    return name[0];
  }

  navigateTo(route: any): void {
    console.log(route);
  }

  handleNotificationClick(): void {
    this._notificationService.info('Sorry!', 'Sorry! This feature is not available right now!')
  }
}
