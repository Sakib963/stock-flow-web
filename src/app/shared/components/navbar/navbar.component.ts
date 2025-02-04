import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, ProfileMenuComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();

  handleProfileMenuActions(event: any): void {
    if (event.action === 'logout') {
      this.handleLogout();
    }
  }

  handleLogout() {
    this.actionEmitter.emit({ action: 'logout', value: null });
  }

  handleMenuOpen() {
    this.actionEmitter.emit({ action: 'menu_open', value: null });
  }
}
