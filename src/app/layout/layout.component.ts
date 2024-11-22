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
  constructor(private _authService: AuthService) {}
  handleLogout(): any {
    this._authService.logout();
  }

  handleActions(event: any): any {
    if (event.action === 'logout') {
      this.handleLogout();
    }
  }
}
