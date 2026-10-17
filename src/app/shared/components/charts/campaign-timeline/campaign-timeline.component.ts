import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const WIDTH = 720;
const HEIGHT = 220;
const TOP = 26;
const BOTTOM = 22;

export interface TimelineBand {
    key: string;
    from: string;
    to: string;
    label: string;
}

export interface TimelinePin {
    key: string;
    day: string;
    label: string;
}

let next = 0;

// Our own SVG, as every analytics chart (no chart package, decided 2026-10-13). The whole chart is one
// image to a screen reader, so its label must carry the windows and posts; the page builds it.
@Component({
    selector: 'campaign-timeline',
    templateUrl: './campaign-timeline.component.html',
    styleUrl: './campaign-timeline.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignTimelineComponent {
    readonly values = input.required<{ day: string; value: number }[]>();
    readonly bands = input<TimelineBand[]>([]);
    readonly pins = input<TimelinePin[]>([]);
    /** The first and last day as the reader writes them. */
    readonly startLabel = input('');
    readonly endLabel = input('');
    readonly label = input('');

    readonly width = WIDTH;
    readonly height = HEIGHT;
    readonly baseline = HEIGHT - BOTTOM;
    readonly gradientId = `campaign-timeline-${++next}`;

    private readonly _index = computed(() => new Map(this.values().map((v, i) => [v.day, i])));
    private readonly _step = computed(() => (this.values().length > 1 ? WIDTH / (this.values().length - 1) : WIDTH));
    readonly max = computed(() => Math.max(1, ...this.values().map((v) => v.value)));

    private x(i: number): number {
        return this.values().length > 1 ? i * this._step() : WIDTH / 2;
    }

    private y(value: number): number {
        return TOP + (1 - value / this.max()) * (this.baseline - TOP);
    }

    readonly line = computed(() => this.values().map((v, i) => `${this.x(i).toFixed(1)},${this.y(v.value).toFixed(1)}`).join(' '));
    readonly area = computed(() => (this.values().length > 1 ? `0,${this.baseline} ${this.line()} ${WIDTH},${this.baseline}` : ''));

    /** A window past either edge of the period is cut at it; one wholly outside is not drawn. */
    readonly shaded = computed(() => {
        const values = this.values();
        if (!values.length) return [];
        const first = values[0].day;
        const last = values[values.length - 1].day;
        const half = this._step() / 2;
        return this.bands()
            .filter((band) => band.to >= first && band.from <= last)
            .map((band, row) => {
                const from = this._index().get(band.from < first ? first : band.from) ?? 0;
                const to = this._index().get(band.to > last ? last : band.to) ?? values.length - 1;
                const x = Math.max(0, this.x(from) - half);
                const end = Math.min(WIDTH, this.x(to) + half);
                return { key: band.key, label: band.label, x, width: Math.max(2, end - x), labelY: 12 + (row % 2) * 10 };
            });
    });

    readonly pinned = computed(() =>
        this.pins()
            .filter((pin) => this._index().has(pin.day))
            .map((pin) => {
                const i = this._index().get(pin.day)!;
                return { key: pin.key, label: pin.label, x: this.x(i), y: this.y(this.values()[i].value) };
            })
    );
}
