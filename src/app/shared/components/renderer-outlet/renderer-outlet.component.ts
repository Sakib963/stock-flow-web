import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Type, computed, effect, inject, input, reflectComponentType, signal, untracked } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { TranslatePipe } from '@ngx-translate/core';
import { RendererKind } from '@app/core/models/renderer.model';
import { RendererRegistry } from '@app/shared/services/renderer-registry/renderer-registry.service';

type OutletStatus = 'loading' | 'ready' | 'missing' | 'failed';

/**
 * Draws the component a config names by key. Internal to the page header, filter, table and list
 * shell page: a page never places one itself.
 *
 * A key nobody registered draws nothing and is logged, never a blank screen with no explanation.
 * A chunk that fails to load (an old tab after a deploy) says so with a retry.
 */
@Component({
    selector: 'renderer-outlet',
    imports: [NgComponentOutlet, NzButtonModule, TranslatePipe],
    templateUrl: './renderer-outlet.component.html',
    styleUrl: './renderer-outlet.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RendererOutletComponent {
    private readonly _registry = inject(RendererRegistry);

    readonly kind = input.required<RendererKind>();
    readonly renderer = input.required<string>();
    /** Everything the renderer receives: its context, the row or field, and the config's inputs. */
    readonly bindings = input<Record<string, unknown>>({});

    readonly status = signal<OutletStatus>('loading');
    readonly component = signal<Type<unknown> | null>(null);
    private readonly _attempt = signal(0);

    /**
     * Only what the renderer declares. Angular throws on an input a component does not have, so a
     * board that ignores its config inputs would otherwise break the whole table.
     */
    readonly accepted = computed(() => {
        const component = this.component();
        const declared = new Set((component ? (reflectComponentType(component)?.inputs ?? []) : []).map((i) => i.templateName));
        return Object.fromEntries(Object.entries(this.bindings()).filter(([key]) => declared.has(key)));
    });

    constructor() {
        effect(() => {
            const kind = this.kind();
            const key = this.renderer();
            this._attempt();
            untracked(() => this.resolve(kind, key));
        });
    }

    retry(): void {
        this._attempt.update((n) => n + 1);
    }

    private async resolve(kind: RendererKind, key: string): Promise<void> {
        this.status.set('loading');
        try {
            const component = await this._registry.load(kind, key);
            if (key !== this.renderer()) return;
            if (!component) {
                console.warn(`[renderer] no ${kind} renderer is registered as "${key}".`);
                this.status.set('missing');
                return;
            }
            this.component.set(component);
            this.status.set('ready');
        } catch (error) {
            console.error(`[renderer] the ${kind} renderer "${key}" failed to load.`, error);
            this.status.set('failed');
        }
    }
}
