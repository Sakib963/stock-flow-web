import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCable, lucideDatabase, lucideHardDrive } from '@ng-icons/lucide';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { EChartsCoreOption } from 'echarts/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { ObservabilityService } from '@app/modules/system/observability/services/observability.service';
import { loader } from '@app/modules/system/observability/utils/loader/loader';
import { ChartComponent, token } from '@app/shared/components/charts/chart/chart.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';

const UNITS = ['B', 'KB', 'MB', 'GB'];

@Component({
    selector: 'database-tab',
    imports: [NgIcon, NzCardModule, NzProgressModule, NzSkeletonModule, TranslatePipe, DigitsPipe, MoneyPipe, ChartComponent],
    providers: [provideIcons({ lucideCable, lucideDatabase, lucideHardDrive })],
    templateUrl: './database-tab.component.html',
    styleUrl: './database-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatabaseTabComponent {
    private readonly _service = inject(ObservabilityService);
    private readonly _translate = inject(TranslateService);
    readonly language = inject(LanguageService).current;

    readonly status = loader(() => this._service.database());

    readonly used = computed(() => {
        const s = this.status.data();
        return s ? Math.round((s.database_bytes / s.plan_bytes) * 1000) / 10 : 0;
    });

    readonly yearsLeft = computed(() => {
        const s = this.status.data();
        if (!s || s.average_bytes_per_day <= 0) return null;
        return Math.floor((s.plan_bytes - s.database_bytes) / (s.average_bytes_per_day * 365));
    });

    readonly dailyChart = computed<EChartsCoreOption>(() => {
        const daily = this.status.data()?.daily ?? [];
        const locale = this.language() === 'bn' ? 'bn-BD' : 'en-GB';
        const day = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
        const label = this._translate.instant('system.health.database.rowsPerDay');
        return {
            grid: { left: 4, right: 4, top: 8, bottom: 4, containLabel: true },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: token('ink'), opacity: 0.05 } } },
            xAxis: { type: 'category', data: daily.map((d) => day(d.day)) },
            yAxis: { type: 'value', minInterval: 1 },
            series: [{ name: label, type: 'bar', data: daily.map((d) => d.requests), barMaxWidth: 18, itemStyle: { color: token('ink-faint'), borderRadius: [3, 3, 0, 0] }, emphasis: { itemStyle: { color: token('primary') } } }],
        };
    });

    constructor() {
        this.status.run(undefined);
    }

    size(bytes: number): string {
        let value = bytes;
        let unit = 0;
        while (value >= 1024 && unit < UNITS.length - 1) {
            value /= 1024;
            unit += 1;
        }
        return `${value.toFixed(unit ? 1 : 0)} ${UNITS[unit]}`;
    }
}
