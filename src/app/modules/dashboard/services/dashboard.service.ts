import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Dashboard, DashboardPeriod } from '@app/core/models/dashboard.model';
import { environment } from '@env/environment';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly _http = inject(HttpClient);

    load(period: DashboardPeriod): Observable<Dashboard> {
        return this._http.get<{ data: Dashboard }>(`${environment.baseUrl}${APIEndpoint.GET_DASHBOARD}`, { params: new HttpParams().set('period', period) }).pipe(map((response) => response.data));
    }
}
