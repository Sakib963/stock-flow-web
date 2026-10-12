import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ActivityEntry, ActivitySummary } from '@app/core/models/activity-log.model';
import { FilterValues } from '@app/core/models/filter.model';

/** Only the filters that hold a value travel, as the server's query string. */
const paramsOf = (filters: FilterValues, extra: Record<string, string | number> = {}): Record<string, string | number> => ({
    ...Object.fromEntries(Object.entries(filters).filter((pair): pair is [string, string] => !!pair[1])),
    ...extra,
});

/** Never cached: the log grows with every action anyone takes. */
@Injectable({ providedIn: 'root' })
export class ActivityLogService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    page(filters: FilterValues, offset: number, limit = 30): Observable<{ rows: ActivityEntry[]; total: number }> {
        return this._http.get<{ data: { rows: ActivityEntry[] }; total: number }>(`${this._base}${APIEndpoint.GET_ACTIVITY_LOG_LIST}`, { params: paramsOf(filters, { offset, limit }) }).pipe(map((response) => ({ rows: response.data.rows, total: response.total })));
    }

    summary(filters: FilterValues): Observable<ActivitySummary> {
        return this._http.get<{ data: ActivitySummary }>(`${this._base}${APIEndpoint.GET_ACTIVITY_LOG_SUMMARY}`, { params: paramsOf(filters) }).pipe(map((response) => response.data));
    }
}
