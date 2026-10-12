import { Injectable, signal } from '@angular/core';

/**
 * The newest config version the server has named in an `X-Config-Version` header.
 *
 * The server bumps it whenever a role, a permission grant, a menu item or the business settings
 * change, and stamps it on every guarded answer. The token interceptor writes it here and the
 * session reloads its payload when it moves, so an open tab takes a change on its next request.
 * It has no dependencies of its own on purpose: the interceptor may not reach SessionService.
 */
@Injectable({ providedIn: 'root' })
export class ConfigVersionService {
    private readonly _latest = signal<number | null>(null);
    readonly latest = this._latest.asReadonly();

    /** Only ever moves forward: an answer that left before a change must not undo it. */
    seen(header: string | null): void {
        const version = Number(header);
        if (!header || !Number.isFinite(version)) return;
        if (this._latest() === null || version > this._latest()!) this._latest.set(version);
    }
}
