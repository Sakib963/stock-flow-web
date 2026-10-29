import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { NavigationError, Router } from '@angular/router';
import { environment } from '@env/environment';

const CHECK_EVERY_MS = 10 * 60 * 1000;

/** What a browser says when the file holding a page's code is gone. Each engine words it differently. */
const MISSING_CODE = /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

/**
 * Tells an open tab that a newer version has been deployed.
 *
 * Every deploy renames the files holding each page's code, and the old ones are gone. A tab still
 * running the old version then fails to open any page it has not opened yet, so the person is told
 * to reload: offered when a newer build is seen, required once a page's code has failed to load.
 *
 * The build is the commit CI stamps into the app and into `version.json` beside it. A build made on
 * a laptop has no stamp and never checks.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
    private readonly _document = inject(DOCUMENT);
    // A laptop's own environment.ts has no `build`; only the files CI writes do.
    private readonly _build = (environment as { build?: string | null }).build ?? null;

    readonly available = signal(false);
    readonly required = signal(false);

    constructor() {
        inject(Router).events.subscribe((e) => {
            if (e instanceof NavigationError && MISSING_CODE.test(String(e.error?.message ?? e.error))) this.required.set(true);
        });

        if (!this._build) return;
        setInterval(() => void this.check(), CHECK_EVERY_MS);
        this._document.addEventListener('visibilitychange', () => {
            if (this._document.visibilityState === 'visible') void this.check();
        });
    }

    async check(): Promise<void> {
        if (!this._build) return;
        try {
            // A file beside the app, not the API: no base URL, no token, so not HttpClient.
            const res = await fetch('version.json', { cache: 'no-store' });
            if (!res.ok) return;
            const { build } = (await res.json()) as { build?: string };
            if (build && build !== this._build) this.available.set(true);
        } catch {
            // Offline or mid-deploy. Nothing is lost by missing one check: the next one asks again.
        }
    }

    later(): void {
        this.available.set(false);
    }

    reload(): void {
        this._document.location.reload();
    }
}
