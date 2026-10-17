import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';

/** One row: two rates out of 100 for the same thing, either one missing when there is too little to rate. */
export interface DumbbellRow {
    key: string;
    label: string;
    first: number | null;
    second: number | null;
    /** What each dot stands on, for the tooltip: "8 of 40". */
    firstNote: string;
    secondNote: string;
}

/**
 * Two dots per row joined by a line, so the gap between two rates reads at a glance. The scale runs
 * from 0 to the highest rate rounded up to ten, so small rates are not squeezed into a corner.
 */
@Component({
    selector: 'dumbbell-chart',
    imports: [NzTooltipModule, TranslatePipe, DigitsPipe],
    templateUrl: './dumbbell-chart.component.html',
    styleUrl: './dumbbell-chart.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DumbbellChartComponent {
    readonly rows = input.required<DumbbellRow[]>();
    /** Copy keys naming the two dots. */
    readonly firstLabel = input.required<string>();
    readonly secondLabel = input.required<string>();

    readonly top = computed(() => Math.max(10, Math.ceil(Math.max(0, ...this.rows().flatMap((r) => [r.first ?? 0, r.second ?? 0])) / 10) * 10));
    readonly ticks = computed(() => [0, this.top() / 2, this.top()]);

    readonly drawn = computed(() => {
        const at = (rate: number | null) => (rate === null ? null : (rate / this.top()) * 100);
        return this.rows().map((row) => {
            const first = at(row.first);
            const second = at(row.second);
            const ends = [first, second].filter((x): x is number => x !== null);
            return { ...row, firstAt: first, secondAt: second, lineFrom: Math.min(...ends), lineWidth: ends.length === 2 ? Math.abs(ends[0] - ends[1]) : 0 };
        });
    });
}
