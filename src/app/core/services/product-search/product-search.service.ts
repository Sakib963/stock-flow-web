import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PosBatch } from '@app/core/models/pos.model';
import { environment } from '@env/environment';
import { TtlCache } from '@app/shared/utils/ttl-cache/ttl-cache';
import { Observable, map } from 'rxjs';

/** How long the list the online order opens on is reused before it is asked for again. */
const BROWSE_TTL_MS = 2 * 60 * 1000;

/** The sellable batches both counters pick from, the counter and the online order (sales REQ-13, REQ-37). A typed search always asks the server. */
@Injectable({ providedIn: 'root' })
export class ProductSearchService {
    private readonly _http = inject(HttpClient);

    // A TtlCache so that signing out empties it with every other cache: the next person at a shared
    // counter must not be shown the last one's list.
    private readonly _browse = new TtlCache<PosBatch[]>(BROWSE_TTL_MS);

    /**
     * The list opened with nothing typed is reused for two minutes, so opening the picker again does
     * not ask the server each time (the user, 2026-10-05). The stock it shows may be a little old; the
     * order is priced and its stock checked again when it is placed. A typed search always asks.
     */
    search(text: string): Observable<PosBatch[]> {
        return text ? this.ask(text) : this._browse.through('browse', () => this.ask(''));
    }

    /** After a sale or an order the list's stock has changed, so the next opening asks again. */
    forget(): void {
        this._browse.forget('browse');
    }

    private ask(text: string): Observable<PosBatch[]> {
        return this._http.get<{ data: PosBatch[] }>(`${environment.baseUrl}${APIEndpoint.GET_POS_PRODUCT_LIST}`, { params: { search_text: text } }).pipe(map((response) => response.data));
    }
}
