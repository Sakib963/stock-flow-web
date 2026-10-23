import { Observable, finalize, of, shareReplay, tap } from 'rxjs';

/**
 * Keeps what a request returned for a while, so going back and forth between a list and a record
 * does not ask the server again for something that has not changed.
 *
 * For reference data only (categories, brands, suppliers), each feature choosing how long. Never
 * for anything that moves by the minute, such as orders or stock on a sale screen: a stale answer
 * there is a wrong answer. It lives in memory, so a reload always starts fresh.
 *
 * Given a stamp, an entry is served only while the stamp still reads what it read when the request
 * left, so a newer version from the server drops it however young it is (docs/caching).
 */
export class TtlCache<T> {
    // Every cache there is, so signing out can empty them all. Signing out does not reload the page,
    // and on a shared counter machine the next person must not be served the last one's records.
    private static readonly _all = new Set<TtlCache<unknown>>();

    private readonly _entries = new Map<string, { at: number; stamp: string; value: T }>();
    private readonly _pending = new Map<string, { stamp: string; request: Observable<T> }>();

    constructor(
        private readonly _ttlMs: number,
        private readonly _stamp: () => string = () => ''
    ) {
        TtlCache._all.add(this);
    }

    static clearAll(): void {
        TtlCache._all.forEach((cache) => {
            cache._entries.clear();
            cache._pending.clear();
        });
    }

    /**
     * The cached value while it is young enough and its stamp still holds, otherwise the request,
     * whose answer is then kept. Callers asking while it is on its way share it; a failure is not kept.
     */
    through(key: string, request: () => Observable<T>): Observable<T> {
        const stamp = this._stamp();
        const entry = this._entries.get(key);
        if (entry && entry.stamp === stamp && Date.now() - entry.at < this._ttlMs) return of(entry.value);

        const pending = this._pending.get(key);
        if (pending && pending.stamp === stamp) return pending.request;

        const shared = request().pipe(
            tap((value) => this._entries.set(key, { at: Date.now(), stamp, value })),
            finalize(() => this._pending.get(key)?.request === shared && this._pending.delete(key)),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        this._pending.set(key, { stamp, request: shared });
        return shared;
    }

    forget(key: string): void {
        this._entries.delete(key);
        this._pending.delete(key);
    }
}
