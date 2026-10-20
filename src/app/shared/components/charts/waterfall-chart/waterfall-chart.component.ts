import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { EChartsCoreOption } from 'echarts/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { ChartComponent, token } from '@app/shared/components/charts/chart/chart.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';

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
    imports: [ChartComponent],
    providers: [MoneyPipe],
    templateUrl: './waterfall-chart.component.html',
    styleUrl: './waterfall-chart.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaterfallChartComponent {
    private readonly _translate = inject(TranslateService);
    private readonly _money = inject(MoneyPipe);
    private readonly _language = inject(LanguageService).current;

    readonly steps = input.required<WaterfallStep[]>();
    readonly label = input('');

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

    readonly height = computed(() => this.steps().length * 40 + 8);

    readonly options = computed<EChartsCoreOption>(() => {
        const language = this._language();
        const bars = this.bars();
        const colour = (bar: (typeof bars)[number]) => (bar.value < 0 ? token('danger') : bar.kind === 'drop' ? token('danger-border') : bar.kind === 'end' ? token('success') : token('ink-faint'));
        const amount = (bar: (typeof bars)[number]) => `${bar.kind === 'drop' && bar.value ? '−' : ''}${this._money.transform(bar.value, 'number')}`;
        return {
            animationDurationUpdate: 300,
            grid: { left: 4, right: 96, top: 4, bottom: 4, containLabel: true },
            xAxis: { type: 'value', max: 100, show: false },
            yAxis: { type: 'category', inverse: true, data: bars.map((bar) => this._translate.instant(bar.label)), axisLine: { show: false }, axisLabel: { color: token('ink-body'), fontSize: 12 } },
            tooltip: {
                trigger: 'item',
                formatter: (params: { dataIndex: number }) => {
                    const bar = bars[params.dataIndex];
                    return localDigits(`${this._translate.instant(bar.label)}: ${amount(bar)} (${bar.share}%)`, language);
                },
            },
            series: [
                { type: 'bar', stack: 'step', silent: true, itemStyle: { color: 'transparent' }, data: bars.map((bar) => bar.left), barWidth: 22 },
                {
                    type: 'bar',
                    stack: 'step',
                    barWidth: 22,
                    data: bars.map((bar) => ({ value: bar.width, itemStyle: { color: colour(bar), borderRadius: 6 } })),
                    emphasis: { focus: 'self' },
                    blur: { itemStyle: { opacity: 0.6 }, label: { opacity: 0.6 } },
                    label: { show: true, position: 'right', distance: 8, color: token('ink'), fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', formatter: (params: { dataIndex: number }) => amount(bars[params.dataIndex]) },
                },
            ],
        };
    });
}
