import { Injectable, inject } from '@angular/core';
import { ConfigVersionService } from '@app/core/services/config-version/config-version.service';
import { TtlCache } from '@app/shared/utils/ttl-cache/ttl-cache';
import { Observable } from 'rxjs';

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * The short lists people pick from (docs/caching, class Reference), kept app-wide and served at once
 * until the server's config or reference version moves, this person saves something they list, they
 * sign out, or ten minutes pass. Nothing carrying stock, orders or money goes through here.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceCache {
    private readonly _versions = inject(ConfigVersionService);
    private readonly _cache = new TtlCache<unknown>(TEN_MINUTES, () => this._versions.stamp());

    keep<T>(key: string, request: () => Observable<T>): Observable<T> {
        return this._cache.through(key, request) as Observable<T>;
    }

    forget(key: string): void {
        this._cache.forget(key);
    }
}
