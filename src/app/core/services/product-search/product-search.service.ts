import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PosBatch } from '@app/core/models/pos.model';
import { environment } from '@env/environment';
import { Observable, map, of, tap } from 'rxjs';

/** How long the list the online order opens on is reused before it is asked for again. */
const BROWSE_TTL_MS = 2 * 60 * 1000;

/** The sellable batches both counters pick from, the counter and the online order (sales REQ-13, REQ-37). A typed search always asks the server. */
@Injectable({ providedIn: 'root' })
export class ProductSearchService {
    private readonly _http = inject(HttpClient);

    private _browse: { at: number; rows: PosBatch[] } | null = null;

    /**
     * The list opened with nothing typed is reused for two minutes, so opening the picker again does
     * not ask the server each time (the user, 2026-10-05). The stock it shows may be a little old; the
     * order is priced and its stock checked again when it is placed. A typed search always asks.
     */
    search(text: string): Observable<PosBatch[]> {
        if (!text && this._browse && Date.now() - this._browse.at < BROWSE_TTL_MS) return of(this._browse.rows);
        return this.ask(text).pipe(tap((rows) => (text ? null : (this._browse = { at: Date.now(), rows }))));
    }

    /** After a sale or an order the list's stock has changed, so the next opening asks again. */
    forget(): void {
        this._browse = null;
    }

    private ask(text: string): Observable<PosBatch[]> {
        return this._http.get<{ data: PosBatch[] }>(`${environment.baseUrl}${APIEndpoint.GET_POS_PRODUCT_LIST}`, { params: { search_text: text } }).pipe(map((response) => response.data));
    }
}
