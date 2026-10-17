import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CustomerFigures, OrderFlow, ProductFigures, SalesAnalyticsQuery, SalesOverview, TeamFigures } from '@app/core/models/sales-analytics.model';

const paramsOf = (query: SalesAnalyticsQuery) => Object.fromEntries(Object.entries(query).filter((pair): pair is [string, string] => !!pair[1]));

/** Never cached: every figure reads orders, returns and payments. */
@Injectable({ providedIn: 'root' })
export class SalesAnalyticsService {
    private readonly _http = inject(HttpClient);

    overview(query: SalesAnalyticsQuery): Observable<SalesOverview> {
        return this._http.get<{ data: SalesOverview }>(`${environment.baseUrl}${APIEndpoint.GET_SALES_ANALYTICS_OVERVIEW}`, { params: paramsOf(query) }).pipe(map((response) => response.data));
    }

    /** Null when the section does not apply: the person does not sell online, or chose the counter. */
    orders(query: SalesAnalyticsQuery): Observable<OrderFlow | null> {
        return this._http.get<{ data: OrderFlow | { applies: false } }>(`${environment.baseUrl}${APIEndpoint.GET_SALES_ANALYTICS_ORDERS}`, { params: paramsOf(query) }).pipe(map((response) => (response.data.applies ? response.data : null)));
    }

    customers(query: SalesAnalyticsQuery): Observable<CustomerFigures> {
        return this._http.get<{ data: CustomerFigures }>(`${environment.baseUrl}${APIEndpoint.GET_SALES_ANALYTICS_CUSTOMERS}`, { params: paramsOf(query) }).pipe(map((response) => response.data));
    }

    products(query: SalesAnalyticsQuery): Observable<ProductFigures> {
        return this._http.get<{ data: ProductFigures }>(`${environment.baseUrl}${APIEndpoint.GET_SALES_ANALYTICS_PRODUCTS}`, { params: paramsOf(query) }).pipe(map((response) => response.data));
    }

    team(query: SalesAnalyticsQuery): Observable<TeamFigures> {
        return this._http.get<{ data: TeamFigures }>(`${environment.baseUrl}${APIEndpoint.GET_SALES_ANALYTICS_TEAM}`, { params: paramsOf(query) }).pipe(map((response) => response.data));
    }
}
