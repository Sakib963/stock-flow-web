import { Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './modules/auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'stock-flow';
  constructor(
    public authService: AuthService,
    private _translate: TranslateService
  ) {
    _translate.addLangs(['en', 'bn']);
    _translate.setDefaultLang('en');

    let lang = localStorage.getItem('app_lang');

    if (!lang) {
      const browserLang = _translate.getBrowserLang();
      lang = browserLang?.match(/en|bn/) ? browserLang : 'en';
      localStorage.setItem('app_lang', lang);
    }

    _translate.use(lang);

    document.body.classList.add(`lang-${lang}`);
  }

  switchLang(lang: string) {
    this._translate.use(lang);

    localStorage.setItem('app_lang', lang);

    document.body.classList.remove('lang-en', 'lang-bn');
    document.body.classList.add(`lang-${lang}`);
  }
}
