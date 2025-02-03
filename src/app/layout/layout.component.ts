import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NavbarComponent } from '@app/shared/components/navbar/navbar.component';
import { SidebarComponent } from '@app/shared/components/sidebar/sidebar.component';
import { FooterComponent } from '@app/shared/components/footer/footer.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NgZorroCustomModule,
    NavbarComponent,
    SidebarComponent,
    FooterComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent {
  isMenuOpen: boolean = false;

  constructor(public authService: AuthService) {}

  handleLogout(): any {
    this.authService.logout();
  }

  handleActions(event: any): any {
    if (event.action === 'logout') {
      this.handleLogout();
    }
    if (event.action === 'menu_open') {
      this.isMenuOpen = true;
    }
  }

  toggleMenu(): any {
    this.isMenuOpen = !this.isMenuOpen;
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.toggleMenu();
    }
  }

  onSidebarClick(event: any) {
    event.stopPropagation();
  }

  onMenuItemClick(event: any) {
    this.toggleMenu();
  }
}
