import { Injectable, InjectionToken, Provider, Type, inject } from '@angular/core';
import { RendererKind, RendererMap } from '@app/core/models/renderer.model';

interface RendererRegistration {
    kind: RendererKind;
    map: RendererMap;
}

const RENDERERS = new InjectionToken<readonly RendererRegistration[]>('RENDERERS');

/**
 * Registers components a config can name by key: a board layout, a stock meter cell, a category
 * tree filter field, a chart slot. Call it in the `providers` of the feature's route, so the code
 * loads only when that feature does.
 *
 *   providers: [provideRenderers('layout', { 'sales.order-board': () => import('./order-board.component').then((m) => m.OrderBoardComponent) })]
 */
export function provideRenderers(kind: RendererKind, map: RendererMap): Provider[] {
    return [{ provide: RENDERERS, multi: true, useValue: { kind, map } }, RendererRegistry];
}

/**
 * Finds a registered renderer by kind and key.
 *
 * A route that registers renderers gets its own registry, holding only its own registrations and
 * falling back to its parent's. Multi providers do not merge across injectors on their own: a
 * child's list would hide the parent's, and a shared renderer would vanish inside every feature
 * that registered one of its own.
 */
@Injectable({ providedIn: 'root' })
export class RendererRegistry {
    private readonly _own = inject(RENDERERS, { self: true, optional: true }) ?? [];
    private readonly _parent = inject(RendererRegistry, { skipSelf: true, optional: true });
    private readonly _loads = new Map<string, Promise<Type<unknown>>>();

    has(kind: RendererKind, key: string): boolean {
        return !!this.loader(kind, key) || !!this._parent?.has(kind, key);
    }

    /**
     * The component for a key, or null when nobody registered it. A failed chunk load rejects and is
     * forgotten, so a retry after a deploy fetches again rather than replaying the failure.
     */
    load(kind: RendererKind, key: string): Promise<Type<unknown> | null> {
        const loader = this.loader(kind, key);
        if (!loader) return this._parent ? this._parent.load(kind, key) : Promise.resolve(null);

        const id = `${kind}:${key}`;
        let pending = this._loads.get(id);
        if (!pending) {
            pending = loader();
            this._loads.set(id, pending);
            pending.catch(() => this._loads.delete(id));
        }
        return pending;
    }

    private loader(kind: RendererKind, key: string) {
        for (const registration of this._own) {
            if (registration.kind === kind && registration.map[key]) return registration.map[key];
        }
        return null;
    }
}
