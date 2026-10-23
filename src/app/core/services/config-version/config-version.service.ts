import { Injectable, signal } from '@angular/core';

/**
 * The newest config version the server has named in an `X-Config-Version` header.
 *
 * The server bumps it whenever a role, a permission grant, a menu item or the business settings
 * change, and stamps it on every guarded answer. The token interceptor writes it here and the
 * session reloads its payload when it moves, so an open tab takes a change on its next request.
 * It has no dependencies of its own on purpose: the interceptor may not reach SessionService.
 *
 * Beside it, the reference version (`X-Reference-Version`): the newest change to anything a picker
 * lists. The kept picker lists are stamped with both, so either moving drops them (docs/caching).
 */
@Injectable({ providedIn: 'root' })
export class ConfigVersionService {
    private readonly _latest = signal<number | null>(null);
    readonly latest = this._latest.asReadonly();

    private _reference: number | null = null;
    // The server reads the reference version before the write it answers, so a person's own save
    // comes back with the old one. Their own saves count here instead.
    private _ownSaves = 0;

    /** Only ever moves forward: an answer that left before a change must not undo it. */
    seen(header: string | null): void {
        const version = Number(header);
        if (!header || !Number.isFinite(version)) return;
        if (this._latest() === null || version > this._latest()!) this._latest.set(version);
    }

    /** Forward only, for the same reason as the config version. */
    seenReference(header: string | null): void {
        const version = Number(header);
        if (!header || !Number.isFinite(version)) return;
        if (this._reference === null || version > this._reference) this._reference = version;
    }

    /** After this person changed something a picker lists, or signed out: every kept list is stale. */
    dropReferenceLists(): void {
        this._ownSaves += 1;
    }

    /** What a kept picker list was fetched at; it is served only while this still reads the same. */
    stamp(): string {
        return `${this._latest() ?? ''}|${this._reference ?? ''}|${this._ownSaves}`;
    }
}
