import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { setSettingsState } from '@app/core/constants/settings-state';

// Loads the shop settings (business profile + delivery defaults) ONCE and holds
// them in a signal. Everything branded (the 3 order prints) and delivery defaults
// read from here, so navigating never refetches. The server caches the row too, so
// this is a cheap call. `order_system` + default delivery charge are also pushed
// into the synchronous settings-state used by routing/menu.
@Injectable({ providedIn: 'root' })
export class SettingsService {
    private _http = inject(HttpClient);

    readonly settings = signal<any>(null);

    private _loaded = false;
    private _inFlight: Promise<void> | null = null;

    // Fetch settings from the API and apply them. Concurrent callers share one request.
    load(): Promise<void> {
        if (this._inFlight) return this._inFlight;
        this._inFlight = firstValueFrom(this._http.get<any>(`${environment.baseUrl}${APIEndpoint.GET_SETTINGS}`))
            .then((res: any) => this.apply(res?.data ?? res?.body?.data ?? res))
            .catch(() => {})
            .finally(() => (this._inFlight = null));
        return this._inFlight;
    }

    // Load only if not already loaded (used before building the sidebar menu).
    ensureLoaded(): Promise<void> {
        if (this._loaded) return Promise.resolve();
        return this.load();
    }

    // Apply a fresh settings object (e.g. right after saving on the Settings page).
    refresh(data?: any): void {
        if (data) this.apply(data);
        else this.load();
    }

    private apply(data: any): void {
        if (!data) return;
        this.settings.set(data);
        setSettingsState({
            order_system: (data.order_system as any) || 'both',
            default_delivery_charge: Number(data.default_delivery_charge ?? 60),
        });
        this._loaded = true;
    }
}
