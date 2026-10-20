import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarDays, lucideClock, lucideList, lucideUsers, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { EChartsCoreOption } from 'echarts/core';
import { ObservabilityRange, RequestFilters } from '@app/core/models/observability.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { ObservabilityService } from '@app/modules/system/observability/services/observability.service';
import { loader } from '@app/modules/system/observability/utils/loader/loader';
import { ChartComponent, token } from '@app/shared/components/charts/chart/chart.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';

@Component({
    selector: 'usage-tab',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTooltipModule, TranslatePipe, MoneyPipe, RecordDatePipe, ChartComponent],
    providers: [provideIcons({ lucideCalendarDays, lucideClock, lucideList, lucideUsers, lucideZap })],
    templateUrl: './usage-tab.component.html',
    styleUrl: './usage-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsageTabComponent {
    private readonly _translate = inject(TranslateService);
    private readonly _service = inject(ObservabilityService);
    readonly language = inject(LanguageService).current;

    readonly range = input.required<ObservabilityRange>();
    readonly openRequests = output<RequestFilters>();

    readonly usage = loader((range: ObservabilityRange) => this._service.usage(range));
    readonly requests = computed(() => (this.usage.data()?.daily ?? []).reduce((sum, d) => sum + d.requests, 0));

    readonly dailyChart = computed<EChartsCoreOption>(() => {
        this.language();
        const daily = this.usage.data()?.daily ?? [];
        const locale = this.language() === 'bn' ? 'bn-BD' : 'en-GB';
        const day = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
        const [requests, people] = [this._translate.instant('system.health.usage.requests'), this._translate.instant('system.health.usage.people')];
        return {
            grid: { left: 4, right: 4, top: 32, bottom: 4, containLabel: true },
            legend: { top: 0, right: 0, data: [requests, people] },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: token('ink'), opacity: 0.05 } } },
            xAxis: { type: 'category', data: daily.map((d) => day(d.day)) },
            yAxis: [{ type: 'value' }, { type: 'value', splitLine: { show: false }, minInterval: 1 }],
            series: [
                { name: requests, type: 'bar', data: daily.map((d) => d.requests), barMaxWidth: 28, itemStyle: { color: token('primary'), opacity: 0.35, borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { opacity: 0.55 } } },
                { name: people, type: 'line', yAxisIndex: 1, data: daily.map((d) => d.people), smooth: true, symbolSize: 6, lineStyle: { color: token('primary'), width: 2 }, itemStyle: { color: token('primary') } },
            ],
        };
    });

    readonly monthChart = computed<EChartsCoreOption>(() => {
        this.language();
        const days = this.usage.data()?.month_days ?? [];
        const counts = new Map(days.map((d) => [d.day, d.requests]));
        const label = this._translate.instant('system.health.usage.requests');
        return {
            grid: { left: 4, right: 4, top: 8, bottom: 4, containLabel: true },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: token('ink'), opacity: 0.05 } } },
            xAxis: { type: 'category', data: Array.from({ length: 31 }, (_, i) => String(i + 1)), axisLabel: { interval: 4 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: [{ name: label, type: 'bar', data: Array.from({ length: 31 }, (_, i) => counts.get(i + 1) ?? 0), itemStyle: { color: token('ink-faint'), borderRadius: [3, 3, 0, 0] }, emphasis: { itemStyle: { color: token('primary') } } }],
        };
    });

    constructor() {
        effect(() => {
            const range = this.range();
            untracked(() => this.usage.run(range));
        });
    }
}
