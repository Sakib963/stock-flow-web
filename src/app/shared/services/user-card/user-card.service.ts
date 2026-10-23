import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ApiResponse } from '@app/core/models/api.model';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { UserCard } from '@app/core/models/user-card.model';
import { ReferenceCache } from '@app/shared/services/reference-cache/reference-cache.service';

/**
 * Who a name in a list belongs to, fetched the first time somebody asks and kept through the
 * reference cache (docs/caching), so a rename or a new photo shows on the next open.
 *
 * A list can carry the same colleague on forty rows, so the request is made once per address and
 * shared: opening four cards for the same person is one call. Nothing is preloaded with the rows,
 * because most people never open a card, and a photo is a data URL heavy enough to matter.
 */
@Injectable({ providedIn: 'root' })
export class UserCardService {
    private readonly _http = inject(HttpClient);
    private readonly _reference = inject(ReferenceCache);

    card(email: string): Observable<UserCard> {
        return this._reference.keep(`user-card:${email.trim().toLowerCase()}`, () =>
            this._http.get<ApiResponse<UserCard>>(`${environment.baseUrl}${APIEndpoint.GET_USER_CARD}`, { params: { email } }).pipe(
                map((response) => response.data),
                catchError((error: HttpErrorResponse) => throwError(() => failureOf(error)))
            )
        );
    }
}
