import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ConfigurationAnalytics } from '@app/core/models/configuration-analytics.model';
import { environment } from '@env/environment';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfigurationAnalyticsService {
    private readonly _http = inject(HttpClient);

    /** Never cached: warehouse fullness reads the stock on hand. */
    read(): Observable<ConfigurationAnalytics> {
        return this._http.get<{ data: ConfigurationAnalytics }>(`${environment.baseUrl}${APIEndpoint.GET_CONFIGURATION_ANALYTICS}`).pipe(map((response) => response.data));
    }
}
