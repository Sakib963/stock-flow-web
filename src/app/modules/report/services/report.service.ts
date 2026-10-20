import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ReportGroup, ReportQuery, ReportResult } from '@app/core/models/report.model';

const ENDPOINTS: Record<ReportGroup, { get: string; download: string }> = {
    sales: { get: APIEndpoint.GET_SALES_REPORT, download: APIEndpoint.DOWNLOAD_SALES_REPORT },
    stock: { get: APIEndpoint.GET_STOCK_REPORT, download: APIEndpoint.DOWNLOAD_STOCK_REPORT },
    customer: { get: APIEndpoint.GET_CUSTOMER_REPORT, download: APIEndpoint.DOWNLOAD_CUSTOMER_REPORT },
    marketing: { get: APIEndpoint.GET_MARKETING_REPORT, download: APIEndpoint.DOWNLOAD_MARKETING_REPORT },
};

const paramsOf = (report: string, query: ReportQuery) => ({ report, ...Object.fromEntries(Object.entries(query).filter((pair): pair is [string, string] => !!pair[1])) });

/** Never cached: every report reads stock, orders or payments. */
@Injectable({ providedIn: 'root' })
export class ReportService {
    private readonly _http = inject(HttpClient);

    run(group: ReportGroup, report: string, query: ReportQuery): Observable<ReportResult> {
        return this._http.get<{ data: ReportResult }>(`${environment.baseUrl}${ENDPOINTS[group].get}`, { params: paramsOf(report, query) }).pipe(map((response) => response.data));
    }

    download(group: ReportGroup, report: string, query: ReportQuery): Observable<HttpResponse<Blob>> {
        return this._http.get(`${environment.baseUrl}${ENDPOINTS[group].download}`, { params: paramsOf(report, query), observe: 'response', responseType: 'blob' });
    }
}
