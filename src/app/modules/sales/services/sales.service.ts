import { HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HttpService } from '@app/core/services/http.service';
import { Observable } from 'rxjs';

/*
      Sales module service.

      Mirrors ConfigurationService so the pre-order feature follows the same
      contract as the configuration gold standard: generic create/detail/update
      plus report download, with the URL passed in by the page.

      The older sales pages (pos, online-order, order-list, order-detail) call
      HttpService directly and are intentionally left alone; only pre-order uses
      this service.
*/
@Injectable({
    providedIn: 'root',
})
export class SalesService {
    private readonly _http = inject(HttpService);

    createItem$(url: string, data: any): Observable<HttpResponse<any>> {
        return this._http.post(url, data);
    }

    getDetail$(url: string, itemId: string): Observable<HttpResponse<any>> {
        const URL = `${url}/${itemId}`;
        return this._http.get(URL, false);
    }

    updateItem$(url: string, data: any): Observable<HttpResponse<any>> {
        return this._http.post(url, data);
    }

    getList$(url: string, params: any = null): Observable<HttpResponse<any>> {
        return this._http.get(url, params);
    }

    postAction$(url: string, data: any): Observable<HttpResponse<any>> {
        return this._http.post(url, data);
    }

    downloadReport$(url: string, data?: any): Observable<any> {
        return this._http.downloadFile(url, data);
    }
}
