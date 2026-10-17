import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { BoundaryFile, MapBoundariesService } from './map-boundaries.service';

/** One district's figure: its id as in our location data, its name to show, the value and the tooltip line. */
export interface MapValue {
    oid: string;
    name: string;
    value: number;
    tip: string;
}

const SHADES = ['fill-line-soft', 'fill-primary/20', 'fill-primary/40', 'fill-primary/65', 'fill-primary'];
const DANGER_SHADES = ['fill-line-soft', 'fill-danger/20', 'fill-danger/40', 'fill-danger/65', 'fill-danger'];

/** How many of the largest districts carry their name on the map. */
const NAMED = 5;

/**
 * Bangladesh by district, our own SVG: each district shaded against the largest value, a district
 * with no figure left plain, and the largest few named on the map.
 */
@Component({
    selector: 'bd-map',
    imports: [NzTooltipModule, TranslatePipe],
    templateUrl: './bd-map.component.html',
    styleUrl: './bd-map.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BdMapComponent {
    readonly values = input.required<MapValue[]>();
    readonly tone = input<'primary' | 'danger'>('primary');
    /** A copy key naming the map for a screen reader. */
    readonly label = input.required<string>();

    readonly boundaries = signal<BoundaryFile | null>(null);
    readonly failed = signal(false);
    readonly hovered = signal<string | null>(null);

    constructor() {
        inject(MapBoundariesService)
            .districts$.pipe(takeUntilDestroyed())
            .subscribe({ next: (file) => this.boundaries.set(file), error: () => this.failed.set(true) });
    }

    readonly shapes = computed(() => {
        const file = this.boundaries();
        if (!file) return [];
        const byOid = new Map(this.values().map((v) => [v.oid, v]));
        const largest = Math.max(0, ...this.values().map((v) => v.value));
        const shades = this.tone() === 'danger' ? DANGER_SHADES : SHADES;
        const named = new Set(
            [...this.values()]
                .filter((v) => v.value > 0)
                .sort((a, b) => b.value - a.value)
                .slice(0, NAMED)
                .map((v) => v.oid)
        );
        return file.districts.map((district) => {
            const value = byOid.get(district.oid);
            const level = value && value.value > 0 && largest > 0 ? Math.max(1, Math.ceil((value.value / largest) * 4)) : 0;
            return { ...district, shade: shades[level], name: value?.name ?? null, tip: value?.tip ?? null, labelled: named.has(district.oid) };
        });
    });

    readonly viewBox = computed(() => {
        const file = this.boundaries();
        return file ? `0 0 ${file.width} ${file.height}` : '0 0 600 848';
    });
}
