import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';

/** A starting amount, what was taken off it step by step, and what was left. */
export interface WaterfallStep {
    key: string;
    /** A copy key, translated here so the chart follows a language switch. */
    label: string;
    value: number;
    kind: 'start' | 'drop' | 'end';
}

/**
 * A horizontal waterfall: the start as a full bar, each drop floating where the running amount
 * stood, the end from zero. Bars are laid out as a share of the start, so it reads at any width.
 */
@Component({
    selector: 'waterfall-chart',
    imports: [NzTooltipModule, TranslatePipe, DigitsPipe, MoneyPipe],
    templateUrl: './waterfall-chart.component.html',
    styleUrl: './waterfall-chart.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaterfallChartComponent {
    readonly steps = input.required<WaterfallStep[]>();

    readonly bars = computed(() => {
        const steps = this.steps();
        const scale = Math.max(1, ...steps.map((s) => Math.abs(s.value)));
        let running = 0;
        // A loss draws from zero in the danger colour; a drop below zero is cut at zero.
        const share = (amount: number) => (amount / scale) * 100;
        return steps.map((step) => {
            let left = 0;
            let width = share(Math.abs(step.value));
            if (step.kind === 'drop') {
                const from = Math.max(0, running - step.value);
                left = share(from);
                width = share(Math.max(0, running) - from);
                running -= step.value;
            } else {
                running = step.value;
            }
            return { ...step, left, width: step.value ? Math.max(width, 0.5) : 0, share: Math.round(share(step.value)) };
        });
    });
}
