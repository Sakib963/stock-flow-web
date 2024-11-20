import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { NzNotificationService } from 'ng-zorro-antd/notification';

import { APIEndpoint } from '../constants/api-endpoint';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  constructor(
    private _httpClient: HttpClient,
    private _notification: NzNotificationService
  ) {}

  private _headers = new HttpHeaders({
    accept: 'application/json',
  });

  get<T>(apiUrl: string, params?: any): any {
    return this._httpClient.get<T>(`${environment.baseUrl}${apiUrl}`, {
      params: params,
      headers: this._headers,
      observe: 'response',
    });
  }

  post(apiUrl: string, body: any): any {
    return this._httpClient.post(`${environment.baseUrl}${apiUrl}`, body, {
      headers: this._headers,
      observe: 'response',
    });
  }

  put(apiUrl: string, body: any): any {
    return this._httpClient.put(`${environment.baseUrl}${apiUrl}`, body, {
      headers: this._headers,
      observe: 'response',
    });
  }
}
