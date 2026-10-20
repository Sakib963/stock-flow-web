import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const WIDTH = 120;
const HEIGHT = 32;

let next = 0;

/** A small trend line under a figure: the shape only, no axes. Fewer than two points draws nothing. */
@Component({
    selector: 'sparkline',
    templateUrl: './sparkline.component.html',
    styleUrl: './sparkline.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparklineComponent {
    readonly values = input.required<number[]>();
    readonly tone = input<'primary' | 'success' | 'danger'>('primary');

    readonly width = WIDTH;
    readonly height = HEIGHT;
    readonly gradientId = `sparkline-${++next}`;

    readonly points = computed(() => {
        const values = this.values();
        if (values.length < 2) return null;
        const low = Math.min(0, ...values);
        const span = Math.max(...values) - low || 1;
        // A pixel of room top and bottom so the stroke is never clipped.
        return values.map((value, i) => [(i / (values.length - 1)) * WIDTH, HEIGHT - 1 - ((value - low) / span) * (HEIGHT - 2)] as const);
    });

    readonly line = computed(
        () =>
            this.points()
                ?.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
                .join(' ') ?? ''
    );
    readonly area = computed(() => (this.points() ? `0,${HEIGHT} ${this.line()} ${WIDTH},${HEIGHT}` : ''));
}
