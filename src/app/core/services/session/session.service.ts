import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { environment } from '@env/environment';
import { LanguageService } from '@app/core/services/language/language.service';
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

    /**
     * The session the payload in memory belongs to, so a second person signing in on the same
     * counter machine cannot inherit the first one's menu and permissions. It is the refresh token,
     * which survives a renewal and changes only at sign-in. The check belongs to
     * whoever holds both halves, which is the shell guard: this service must not depend on
     * AuthService, because the token interceptor depends on AuthService and the translation files
     * are fetched through it. That ring is a boot-time circular dependency.
     */
    private readonly _loadedFor = signal<string | null>(null);
    readonly loadedFor = this._loadedFor.asReadonly();

    readonly user = computed(() => this._payload()?.user ?? null);
    readonly business = computed(() => this._payload()?.business ?? null);

    /**
     * Initials for the avatar, which is the only place a photo would otherwise be needed.
     *
     * Here rather than in a component because the header trigger and the account panel are two
     * components drawing the same avatar, and a second copy of this would be the one that drifted.
     */
    readonly initials = computed(() => {
        const name = this.user()?.name ?? '';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '?';
        return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    });
    readonly menu = computed(() => this._payload()?.menu ?? []);
    readonly notifications = computed(() => this._payload()?.counters?.notifications ?? 0);

    /** A Set, because `can()` is called on every guarded control on every render. */
    private readonly _permissions = computed(() => new Set(this._payload()?.permissions ?? []));

    async load(owner: string): Promise<void> {
        const response = await firstValueFrom(this._http.get<{ data: SessionPayload }>(`${environment.baseUrl}${APIEndpoint.GET_USER_INFO}`));
        this._payload.set(response?.data ?? null);
        this._loadedFor.set(owner);
    }

    clear(): void {
        this._payload.set(null);
        this._loadedFor.set(null);
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
