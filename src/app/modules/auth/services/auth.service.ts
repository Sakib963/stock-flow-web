import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { environment } from '@env/environment';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Observable, tap, map, catchError, throwError, of } from 'rxjs';
import { Constants } from 'src/app/core/constants/constants';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly baseUrl: any;
  public _userInfo = signal({
    role: '',
    name: '',
    email: '',
    photo: '',
    mobile_number: '',
    designation: '',
  });
  loading = signal(false);
  private isGuestUser = false;

  constructor(
    private _httpClient: HttpClient,
    private _router: Router,
    private _notificationService: NzNotificationService
  ) {
    this.baseUrl = environment.baseUrl;
  }

  setGuestUser(status: boolean) {
    this.isGuestUser = status;
  }

  getGuestUserStatus(): boolean {
    return this.isGuestUser;
  }

  get isLoading(): any {
    return this.loading();
  }

  get userInfo(): any {
    return this._userInfo();
  }

  get currentUserRole(): string {
    return this._userInfo()?.role;
  }

  getUserInfo(): Observable<any> {
    if (!this.loading()) {
      this.loading.set(true);
    }
    return this._httpClient.get<any>(
      `${environment.baseUrl + APIEndpoint.GET_USER_INFO}`
    );
  }

  login(data: any): Observable<any> {
    return this._httpClient
      .post<any>(`${this.baseUrl + APIEndpoint.SIGN_IN}`, data)
      .pipe(
        tap((tokens) => {
          this.storeTokens(tokens.data);
        }),
        map((res) => {
          return res;
        }),
        catchError((error) => {
          this._notificationService.error('Error!', error?.error?.message);
          return throwError(() => new Error(error));
        })
      );
  }

  logout(): any {
    this.doLogoutUser();
  }

  isLoggedIn() {
    return of(!!this.getJwtToken());
  }

  getJwtToken() {
    let token = JSON.parse(
      localStorage.getItem(Constants.AUTH_STORE_KEY) || '{}'
    );
    return token.access_token || '';
  }

  refreshToken() {
    return this._httpClient
      .post<any>(`${this.baseUrl + APIEndpoint.REFRESH_TOKEN}`, {
        refresh_token: this.getRefreshToken(),
      })
      .pipe(
        tap((tokens) => {
          this.storeTokens(tokens.data);
        }),
        catchError((error) => {
          this.doLogoutUser();
          return throwError(() => new Error(error));
        })
      );
  }

  private getRefreshToken() {
    let token = JSON.parse(
      localStorage.getItem(Constants.AUTH_STORE_KEY) || '{}'
    );
    return token.refresh_token;
  }

  private doLogoutUser() {
    this.removeTokens();
    this._router.navigate([Constants.LOGIN_ROUTE]);
  }

  private storeTokens(tokens: any) {
    localStorage.setItem(
      Constants.AUTH_STORE_KEY,
      JSON.stringify({
        access_token: tokens?.access_token,
        refresh_token: tokens?.refresh_token,
      })
    );
  }

  removeTokens(): any {
    localStorage.removeItem(Constants.AUTH_STORE_KEY);
  }
}
