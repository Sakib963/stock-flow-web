import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    AngularSvgIconModule,
    FormsModule,
  ],
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.scss'],
})
export class ProfileMenuComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  notifications: any[] = [];
  userInfo: any;
  isDropdownOpen: boolean = false;

  selectedLang = 'en';

  constructor(
    private _authService: AuthService,
    private _notificationService: NzNotificationService,
    private _translate: TranslateService
  ) {
    this.userInfo = this._authService.userInfo;
  }

  ngOnInit() {
    // Get current language from TranslateService or localStorage
    const savedLang = localStorage.getItem('app_lang');
    if (savedLang && ['en', 'bn'].includes(savedLang)) {
      this.selectedLang = savedLang;
    } else {
      this.selectedLang =
        this._translate.currentLang || this._translate.getDefaultLang() || 'en';
    }

    // Use the language in TranslateService
    this._translate.use(this.selectedLang);
    this.updateBodyClass(this.selectedLang);
  }

  switchLang(lang: string) {
    console.log('Switching language to:', lang);
    this.selectedLang = lang;
    this._translate.use(lang);
    localStorage.setItem('app_lang', lang);
    this.updateBodyClass(lang);
  }

  private updateBodyClass(lang: string) {
    document.body.classList.remove('lang-en', 'lang-bn');
    document.body.classList.add(`lang-${lang}`);
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
    this._notificationService.info(
      'Sorry!',
      'Sorry! This feature is not available right now!'
    );
  }
}
