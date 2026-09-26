import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Choice, RemoteChoices } from '@app/core/models/filter.model';
import { TtlCache } from '@app/shared/utils/ttl-cache/ttl-cache';
import { environment } from '@env/environment';
import { Observable, map, shareReplay } from 'rxjs';

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * The choices a picker loads from a dropdown endpoint, kept for ten minutes.
 *
 * Provided by the component that shows the picker, never app-wide, so the choices live only as long
 * as the page: reopening a filter reuses them, and leaving the page drops them. Only for reference
 * data such as categories and brands, never for anything carrying stock.
 */
@Injectable()
export class ChoicesService {
    private readonly _http = inject(HttpClient);
    private readonly _cache = new TtlCache<readonly Choice[]>(TEN_MINUTES);
    // Two pickers opening at once share the request in flight rather than sending two.
    private readonly _inFlight = new Map<string, Observable<readonly Choice[]>>();

    load(source: RemoteChoices): Observable<readonly Choice[]> {
        const key = this.keyOf(source);
        const pending = this._inFlight.get(key);
        if (pending) return pending;

        const request = this._cache.through(key, () => this.fetch(source)).pipe(shareReplay({ bufferSize: 1, refCount: false }));
        this._inFlight.set(key, request);
        const release = () => this._inFlight.delete(key);
        request.subscribe({ complete: release, error: release });
        return request;
    }

    /** After a write that adds to these choices, so the next load asks the server again. */
    forget(source: RemoteChoices): void {
        this._cache.forget(this.keyOf(source));
    }

    private fetch(source: RemoteChoices): Observable<readonly Choice[]> {
        const value = source.value ?? 'value';
        const label = source.label ?? 'label';
        return this._http.get<{ data: Record<string, unknown>[] | Record<string, Record<string, unknown>[]> }>(`${environment.baseUrl}${source.endpoint}`, { params: this.paramsOf(source) }).pipe(
            map(({ data }) => (source.rows ? (data as Record<string, Record<string, unknown>[]>)[source.rows] : (data as Record<string, unknown>[])) ?? []),
            map((rows) => rows.map((row) => ({ value: String(row[value]), label: String(row[label]) })))
        );
    }

    /** Fixed params only. A param that follows another filter's value is not something any picker needs yet. */
    private paramsOf(source: RemoteChoices): Record<string, string> {
        const params: Record<string, string> = {};
        for (const [key, param] of Object.entries(source.params ?? {})) {
            if (typeof param !== 'object') params[key] = String(param);
        }
        return params;
    }

    private keyOf(source: RemoteChoices): string {
        return `${source.endpoint}?${new URLSearchParams(this.paramsOf(source))}`;
    }
}
