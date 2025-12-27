import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { NzNotificationService } from 'ng-zorro-antd/notification';

import { APIEndpoint } from '../constants/api-endpoint';
import { environment } from '@env/environment';

type HttpOptions = {
  headers?: HttpHeaders | { [header: string]: string | string[] } | undefined;
  params?:
    | HttpParams
    | {
        [param: string]:
          | string
          | number
          | boolean
          | ReadonlyArray<string | number | boolean>;
      };
};
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

  delete<T>(url: string, options?: HttpOptions): Observable<HttpResponse<T>> {
    return this._httpClient.delete<T>(`${environment.baseUrl}${url}`, {
      headers: this._headers,
      observe: 'response',
      ...options,
    });
  }

  getList(url: string, params?: any): Observable<any> {
    let httpParams = new HttpParams();
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        if (params[key]) {
          httpParams = httpParams.set(key, params[key]);
        } else if (httpParams.has(key)) {
          httpParams = httpParams.delete(key);
        }
      }
    }

    return this._httpClient.get(`${url}`, { params: httpParams });
  }

  downloadFile(apiUrl: string, payload: any): any {
    return this._httpClient.post(`${environment.baseUrl}${apiUrl}`, payload, {
      headers: this._headers,
      responseType: 'blob',
      observe: 'response',
    });
  }
}
