import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';

/** Sets, changes or clears one batch's expiry date, from any page that shows the batch. */
@Injectable({ providedIn: 'root' })
export class BatchExpiryService {
    private readonly _http = inject(HttpClient);

    /** Whether anything changed: the server writes nothing when the batch already has this date. */
    update(inventory_oid: string, expiry_date: string | null): Observable<boolean> {
        return this._http.post<{ data?: { changed?: boolean } }>(`${environment.baseUrl}${APIEndpoint.UPDATE_BATCH_EXPIRY}`, { inventory_oid, expiry_date }).pipe(map((response) => response.data?.changed !== false));
    }
}
