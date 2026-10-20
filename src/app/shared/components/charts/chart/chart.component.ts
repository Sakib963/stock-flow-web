import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import type { EChartsCoreOption } from 'echarts/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { echarts } from './echarts';

export const token = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();

@Component({
    selector: 'chart',
    imports: [NgxEchartsDirective],
    providers: [provideEchartsCore({ echarts })],
    templateUrl: './chart.component.html',
    styleUrl: './chart.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent {
    private readonly _language = inject(LanguageService).current;

    readonly options = input.required<EChartsCoreOption>();
    readonly height = input(200);
    readonly label = input.required<string>();

    readonly init = { renderer: 'svg' as const };

    readonly theme = computed(() => {
        const font = this._language() === 'bn' ? "'Hind Siliguri', 'Mulish', sans-serif" : "'Mulish', system-ui, sans-serif";
        const axis = { axisLine: { lineStyle: { color: token('line') } }, axisTick: { show: false }, axisLabel: { color: token('ink-muted'), fontSize: 11 }, splitLine: { lineStyle: { color: token('line-soft'), type: 'dashed' } } };
        return {
            color: [token('primary'), token('ink-faint')],
            textStyle: { fontFamily: font, color: token('ink-body') },
            legend: { textStyle: { color: token('ink-muted'), fontSize: 12 }, itemWidth: 10, itemHeight: 10, icon: 'roundRect' },
            categoryAxis: { ...axis, splitLine: { show: false } },
            valueAxis: { ...axis, axisLine: { show: false } },
        };
    });

    readonly themed = computed<EChartsCoreOption>(() => {
        const options = this.options() as EChartsCoreOption & { tooltip?: object };
        return {
            animationDuration: 400,
            animationEasing: 'cubicOut',
            ...options,
            tooltip: {
                backgroundColor: token('white'),
                borderColor: token('line'),
                borderWidth: 1,
                padding: [8, 10],
                textStyle: { color: token('ink-body'), fontSize: 12, fontFamily: this.theme().textStyle.fontFamily },
                extraCssStyle: 'box-shadow: 0 6px 16px color-mix(in srgb, var(--color-ink) 8%, transparent); border-radius: 8px;',
                ...options.tooltip,
            },
        };
    });
}
