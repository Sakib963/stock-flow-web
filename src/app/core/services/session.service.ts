import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { environment } from '@env/environment';
import { LanguageService } from '@app/core/services/language.service';
import { firstValueFrom } from 'rxjs';
import { MenuItem, SessionPayload } from '@app/core/models/session.model';

/**
 * Everything the shell knows about the signed-in person: who they are, the business, what they may
 * do, and the menu that follows from it.
 *
 * Loaded once at boot rather than per navigation. The server sends an ETag with
 * `Cache-Control: private, no-cache`, so the browser revalidates on its own and a reload where
 * nothing changed costs a 304 with no body. There is deliberately no hand-rolled ETag handling
 * here: doing it manually would bypass the HTTP cache that is already doing the job correctly.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
    private readonly _http = inject(HttpClient);
    private readonly _language = inject(LanguageService);

    private readonly _payload = signal<SessionPayload | null>(null);
    readonly loaded = computed(() => this._payload() !== null);

    readonly user = computed(() => this._payload()?.user ?? null);
    readonly business = computed(() => this._payload()?.business ?? null);
    readonly menu = computed(() => this._payload()?.menu ?? []);
    readonly notifications = computed(() => this._payload()?.counters?.notifications ?? 0);

    /** A Set, because `can()` is called on every guarded control on every render. */
    private readonly _permissions = computed(() => new Set(this._payload()?.permissions ?? []));

    async load(): Promise<void> {
        const response = await firstValueFrom(this._http.get<{ data: SessionPayload }>(`${environment.baseUrl}${APIEndpoint.GET_USER_INFO}`));
        this._payload.set(response?.data ?? null);
    }

    clear(): void {
        this._payload.set(null);
    }

    /**
     * Whether the signed-in person holds a permission.
     *
     * UX only. Hiding a button does not protect an endpoint, and every request should be assumed
     * hand-written. The server checks the same code again on the way in.
     */
    can(code: string): boolean {
        return this._permissions().has(code);
    }

    canAny(...codes: string[]): boolean {
        return codes.some((c) => this.can(c));
    }

    /** The label for the current language, falling back to English when Bengali is missing. */
    label(item: MenuItem): string {
        return this._language.current() === 'bn' ? item.label.bn || item.label.en : item.label.en;
    }

    description(item: MenuItem): string {
        const bn = this._language.current() === 'bn';
        return (bn ? item.description.bn || item.description.en : item.description.en) ?? '';
    }

    /** Why a feature is present but unusable, in the current language. */
    disabledMessage(item: MenuItem): string {
        const bn = this._language.current() === 'bn';
        return (bn ? item.disabledMessage.bn || item.disabledMessage.en : item.disabledMessage.en) ?? '';
    }

    /**
     * Flattened leaves, for global search. Groups are dropped because navigating to a header does
     * nothing. Matching is over label in both languages, description, and tags, so someone typing
     * "ফেরত" and someone typing "refund" both reach Returns.
     */
    search(term: string): MenuItem[] {
        const q = term.trim().toLowerCase();
        if (!q) return [];

        const leaves = (items: MenuItem[]): MenuItem[] => items.flatMap((i) => (i.children.length ? leaves(i.children) : i.route ? [i] : []));

        return leaves(this.menu()).filter((item) => {
            const haystack = [item.label.en, item.label.bn, item.description.en ?? '', item.description.bn ?? '', ...item.tags].join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }
}
