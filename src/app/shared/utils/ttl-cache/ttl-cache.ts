import { Observable, of, tap } from 'rxjs';

/**
 * Keeps what a request returned for a while, so going back and forth between a list and a record
 * does not ask the server again for something that has not changed.
 *
 * For reference data only (categories, brands, suppliers), each feature choosing how long. Never
 * for anything that moves by the minute, such as orders or stock on a sale screen: a stale answer
 * there is a wrong answer. It lives in memory, so a reload always starts fresh.
 */
export class TtlCache<T> {
    // Every cache there is, so signing out can empty them all. Signing out does not reload the page,
    // and on a shared counter machine the next person must not be served the last one's records.
    private static readonly _all = new Set<TtlCache<unknown>>();

    private readonly _entries = new Map<string, { at: number; value: T }>();

    constructor(private readonly _ttlMs: number) {
        TtlCache._all.add(this);
    }

    static clearAll(): void {
        TtlCache._all.forEach((cache) => cache._entries.clear());
    }

    /** The cached value while it is young enough, otherwise the request, whose answer is then kept. */
    through(key: string, request: () => Observable<T>): Observable<T> {
        const entry = this._entries.get(key);
        if (entry && Date.now() - entry.at < this._ttlMs) return of(entry.value);
        return request().pipe(tap((value) => this._entries.set(key, { at: Date.now(), value })));
    }

    forget(key: string): void {
        this._entries.delete(key);
    }
}
