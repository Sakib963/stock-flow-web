import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';

/** One band of the pyramid: its label (a copy key) and a count on each side. */
export interface PyramidRow {
    key: string;
    label: string;
    left: number;
    right: number;
}

/**
 * A population pyramid: one row per band, the left count growing left from the middle and the right
 * count growing right, both against the largest count on either side so the two halves compare.
 */
@Component({
    selector: 'pyramid-chart',
    imports: [NzTooltipModule, TranslatePipe, DigitsPipe],
    templateUrl: './pyramid-chart.component.html',
    styleUrl: './pyramid-chart.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PyramidChartComponent {
    readonly rows = input.required<PyramidRow[]>();
    /** Copy keys naming the two sides. */
    readonly leftLabel = input.required<string>();
    readonly rightLabel = input.required<string>();

    readonly drawn = computed(() => {
        const rows = this.rows();
        const widest = Math.max(1, ...rows.flatMap((r) => [r.left, r.right]));
        return rows.map((r) => ({ ...r, leftWidth: (r.left / widest) * 100, rightWidth: (r.right / widest) * 100 }));
    });
}
