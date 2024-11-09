import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Observable, tap, map, catchError, throwError } from 'rxjs';
import { Constants } from 'src/app/core/constants/constants';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly baseUrl: any;
  private _userInfo = signal({
    role: '',
    menu_json: [],
    name: '',
    user_id: '',
  });
  loading = signal(false);

  constructor(
    private _httpClient: HttpClient,
    private _router: Router,
    private _notification: NzNotificationService
  ) {}

  get isLoading(): any {
    return this.loading();
  }

  set userInfo(value: any) {
    this._userInfo.set(value);
  }
  get userInfo(): any {
    return this._userInfo();
  }

  get currentUserRole(): string {
    return this._userInfo()?.role;
  }

  getUserInfo(): any {
    return this.userInfo;
  }

  removeTokens(): any {}
}
