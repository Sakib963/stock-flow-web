import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Choice, RemoteChoices } from '@app/core/models/filter.model';
import { ReferenceCache } from '@app/shared/services/reference-cache/reference-cache.service';
import { environment } from '@env/environment';
import { Observable, map } from 'rxjs';

/** Every searching picker pages the same way, as the product pickers in the sales and stock forms do. */
export const pageSizeOf = (source: RemoteChoices): number => source.pageSize ?? 50;

/**
 * The choices a picker loads from a dropdown endpoint, kept app-wide through the reference cache, so
 * a list loaded by one page's filter opens the next page's picker at once (docs/caching). Only for
 * reference data such as categories and brands, never for anything carrying stock.
 */
@Injectable({ providedIn: 'root' })
export class ChoicesService {
    private readonly _http = inject(HttpClient);
    private readonly _reference = inject(ReferenceCache);

    load(source: RemoteChoices): Observable<readonly Choice[]> {
        return this._reference.keep(this.keyOf(source), () => this.fetch(source));
    }

    /** After a write that adds to these choices, so the next load asks the server again. */
    forget(source: RemoteChoices): void {
        this._reference.forget(this.keyOf(source));
    }

    /** One page of a picker that searches on the server. Never cached: each search asks for a different slice. */
    page(source: RemoteChoices, term: string, offset: number): Observable<readonly Choice[]> {
        return this.fetch(source, { ...this.paramsOf(source), [source.search?.key ?? 'search']: term, offset: String(offset), limit: String(pageSizeOf(source)) });
    }

    /** Only the choices for values a field already holds, so their names show without loading the list. */
    named(source: RemoteChoices, values: readonly string[]): Observable<readonly Choice[]> {
        return this.fetch(source, { ...this.paramsOf(source), [source.resolve?.key ?? 'oids']: values.join(',') });
    }

    private fetch(source: RemoteChoices, params: Record<string, string> = this.paramsOf(source)): Observable<readonly Choice[]> {
        const value = source.value ?? 'value';
        const label = source.label ?? 'label';
        return this._http.get<{ data: Record<string, unknown>[] | Record<string, Record<string, unknown>[]> }>(`${environment.baseUrl}${source.endpoint}`, { params }).pipe(
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
        return `choices:${source.endpoint}?${new URLSearchParams(this.paramsOf(source))}`;
    }
}
