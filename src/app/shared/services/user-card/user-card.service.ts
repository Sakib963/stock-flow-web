import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ApiResponse, RequestFailure } from '@app/core/models/api.model';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { UserCard } from '@app/core/models/user-card.model';

/**
 * Who a name in a list belongs to, fetched the first time somebody asks and kept for the visit.
 *
 * A list can carry the same colleague on forty rows, so the request is made once per address and
 * shared: opening four cards for the same person is one call. Nothing is preloaded with the rows,
 * because most people never open a card, and a photo is a data URL heavy enough to matter.
 */
@Injectable({ providedIn: 'root' })
export class UserCardService {
    private readonly _http = inject(HttpClient);
    private readonly _cards = new Map<string, Observable<UserCard>>();

    card(email: string): Observable<UserCard> {
        const key = email.trim().toLowerCase();
        const held = this._cards.get(key);
        if (held) return held;

        const request = this._http.get<ApiResponse<UserCard>>(`${environment.baseUrl}${APIEndpoint.GET_USER_CARD}`, { params: { email } }).pipe(
            map((response) => response.data),
            catchError((error: HttpErrorResponse) => {
                // A failure is not cached: the next click should ask again rather than repeat an
                // error from a connection that has since come back.
                this._cards.delete(key);
                return throwError(() => failureOf(error));
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        this._cards.set(key, request);
        return request;
    }

    forget(): void {
        this._cards.clear();
    }
}
