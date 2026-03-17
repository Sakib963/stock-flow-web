import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { environment } from '@env/environment.production';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ConfigurationService {
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

    downloadReport$(url: string, data?: any): Observable<any> {
        return this._http.downloadFile(url, data);
    }

    // Analytics Methods
    getAnalyticsMetrics$(params: any): Observable<HttpResponse<any>> {
        return this._http.post(APIEndpoint.GET_ANALYTICS_METRICS, params);
    }

    getStockTrend$(params: any): Observable<HttpResponse<any>> {
        return this._http.post(APIEndpoint.GET_STOCK_TREND, params);
    }

    getInventoryValueTrend$(params: any): Observable<HttpResponse<any>> {
        return this._http.post(APIEndpoint.GET_INVENTORY_VALUE_TREND, params);
    }

    getTopProducts$(params: any): Observable<HttpResponse<any>> {
        return this._http.post(APIEndpoint.GET_TOP_PRODUCTS, params);
    }

    getProductPerformance$(params: any): Observable<HttpResponse<any>> {
        return this._http.post(APIEndpoint.GET_PRODUCT_PERFORMANCE, params);
    }

    getStockMovements$(params: any): Observable<HttpResponse<any>> {
        return this._http.post(APIEndpoint.GET_STOCK_MOVEMENTS, params);
    }

    getConfigurationDashboardSummary$(params: any = {}): Observable<HttpResponse<any>> {
        return this._http.post(APIEndpoint.GET_CONFIGURATION_DASHBOARD_SUMMARY, params);
    }
}
