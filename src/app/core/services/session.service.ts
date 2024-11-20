import { Injectable, signal } from '@angular/core';
import { of } from 'rxjs';
import { Constants } from '../constants/constants';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private _userInfo = signal({
    role: '',
    name: '',
    email: '',
  });
  loading = signal(false);

  constructor() {}

  get isLoading(): any {
    return this.loading();
  }

  get userInfo(): any {
    return this._userInfo();
  }

  get currentUserRole(): string {
    return this._userInfo()?.role;
  }

  isLoggedIn(): any {
    return of(!!this.getJwtToken());
  }

  getJwtToken(): string {
    let token = JSON.parse(
      localStorage.getItem(Constants.AUTH_STORE_KEY) || '{}'
    );
    return token.access_token || '';
  }
}
