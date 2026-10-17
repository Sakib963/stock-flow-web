import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CampaignResults, MarketingComparisons, MarketingOverview, MarketingSources } from '@app/core/models/marketing-analytics.model';
import { SalesAnalyticsQuery } from '@app/core/models/sales-analytics.model';

const paramsOf = (query: SalesAnalyticsQuery) => Object.fromEntries(Object.entries(query).filter((pair): pair is [string, string] => !!pair[1]));

/** Never cached: every figure reads orders, campaigns and what was given away. */
@Injectable({ providedIn: 'root' })
export class MarketingAnalyticsService {
    private readonly _http = inject(HttpClient);

    overview(query: SalesAnalyticsQuery): Observable<MarketingOverview> {
        return this._http.get<{ data: MarketingOverview }>(`${environment.baseUrl}${APIEndpoint.GET_MARKETING_ANALYTICS_OVERVIEW}`, { params: paramsOf(query) }).pipe(map((response) => response.data));
    }

    comparisons(query: SalesAnalyticsQuery): Observable<MarketingComparisons> {
        return this._http.get<{ data: MarketingComparisons }>(`${environment.baseUrl}${APIEndpoint.GET_MARKETING_COMPARISONS}`, { params: paramsOf(query) }).pipe(map((response) => response.data));
    }

    sources(query: SalesAnalyticsQuery): Observable<MarketingSources> {
        return this._http.get<{ data: MarketingSources }>(`${environment.baseUrl}${APIEndpoint.GET_MARKETING_SOURCES}`, { params: paramsOf(query) }).pipe(map((response) => response.data));
    }

    results(query: SalesAnalyticsQuery): Observable<CampaignResults> {
        return this._http.get<{ data: CampaignResults }>(`${environment.baseUrl}${APIEndpoint.GET_MARKETING_CAMPAIGN_RESULTS}`, { params: paramsOf(query) }).pipe(map((response) => response.data));
    }
}
