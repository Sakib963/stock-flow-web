import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HttpService } from '@app/core/services/http.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class InventoryService {
    private readonly _http = inject(HttpService);
    private readonly _httpClient = inject(HttpClient);

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

    // Generic POST for workflow transitions (approve / reject / cancel / reverse)
    action$(url: string, data: any): Observable<HttpResponse<any>> {
        return this._http.post(url, data);
    }

    downloadReport$(url: string, data?: any): Observable<any> {
        return this._http.downloadFile(url, data);
    }
}
