import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Crash, DatabaseStatus, LoggedRequest, LoggedRequestDetails, ObservabilityRange, ObservabilityUsage, RequestFilters, RouteMetric, Signal } from '@app/core/models/observability.model';

const paramsOf = (values: object): Record<string, string | number> => Object.fromEntries(Object.entries(values).filter((pair): pair is [string, string | number] => pair[1] !== undefined && pair[1] !== null && pair[1] !== ''));

@Injectable({ providedIn: 'root' })
export class ObservabilityService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    private read<T>(endpoint: string, params: object): Observable<T> {
        return this._http.get<{ data: T }>(`${this._base}${endpoint}`, { params: paramsOf(params) }).pipe(map((response) => response.data));
    }

    usage(range: ObservabilityRange): Observable<ObservabilityUsage> {
        return this.read(APIEndpoint.GET_OBSERVABILITY_USAGE, range);
    }

    metrics(range: ObservabilityRange): Observable<RouteMetric[]> {
        return this.read<{ rows: RouteMetric[] }>(APIEndpoint.GET_ROUTE_METRICS, range).pipe(map((data) => data.rows));
    }

    requests(range: ObservabilityRange, filters: RequestFilters, offset: number, limit: number): Observable<{ rows: LoggedRequest[]; total: number }> {
        return this._http.get<{ data: { rows: LoggedRequest[] }; total: number }>(`${this._base}${APIEndpoint.GET_REQUEST_LIST}`, { params: paramsOf({ ...range, ...filters, offset, limit }) }).pipe(map((response) => ({ rows: response.data.rows, total: response.total })));
    }

    request(oid: string): Observable<LoggedRequestDetails> {
        return this.read(`${APIEndpoint.GET_REQUEST_DETAILS}/${encodeURIComponent(oid)}`, {});
    }

    signals(range: ObservabilityRange): Observable<Signal[]> {
        return this.read<{ signals: Signal[] }>(APIEndpoint.GET_SIGNALS, range).pipe(map((data) => data.signals));
    }

    crashes(range: ObservabilityRange): Observable<Crash[]> {
        return this.read<{ rows: Crash[] }>(APIEndpoint.GET_CRASH_LIST, range).pipe(map((data) => data.rows));
    }

    database(): Observable<DatabaseStatus> {
        return this.read(APIEndpoint.GET_DATABASE_STATUS, {});
    }
}
