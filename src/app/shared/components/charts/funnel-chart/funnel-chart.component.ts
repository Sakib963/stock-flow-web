import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';

/** One step of a funnel, and what happened between it and the next. Labels are copy keys. */
export interface FunnelStep {
    key: string;
    label: string;
    count: number;
    value: number;
    /** Lines under the step: what was lost on the way to the next one, and what is still on its way. */
    notes?: { key: string; params: Record<string, string | number>; tone: 'lost' | 'open' }[];
}

/** Stepped bars, each as wide as its share of the first step, so the leak shows as the bars narrow. */
@Component({
    selector: 'funnel-chart',
    imports: [TranslatePipe, DigitsPipe, MoneyPipe],
    templateUrl: './funnel-chart.component.html',
    styleUrl: './funnel-chart.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FunnelChartComponent {
    readonly steps = input.required<FunnelStep[]>();

    readonly rows = computed(() => {
        const steps = this.steps();
        const first = steps[0]?.count || 1;
        return steps.map((step, i) => ({ ...step, last: i === steps.length - 1, share: Math.round((step.count / first) * 100), width: step.count ? Math.max((step.count / first) * 100, 1) : 0 }));
    });
}
