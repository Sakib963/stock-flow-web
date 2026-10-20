import { ChangeDetectionStrategy, Component, effect, inject, input, output, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideList } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { ObservabilityRange, RequestFilters, RouteMetric } from '@app/core/models/observability.model';
import { ObservabilityService } from '@app/modules/system/observability/services/observability.service';
import { loader } from '@app/modules/system/observability/utils/loader/loader';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';

const by = (key: keyof RouteMetric) => (a: RouteMetric, b: RouteMetric) => Number(a[key] ?? 0) - Number(b[key] ?? 0);

@Component({
    selector: 'metrics-tab',
    imports: [DecimalPipe, NgIcon, NzButtonModule, NzCardModule, NzTableModule, NzTooltipModule, TranslatePipe, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideList })],
    templateUrl: './metrics-tab.component.html',
    styleUrl: './metrics-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsTabComponent {
    private readonly _service = inject(ObservabilityService);

    readonly range = input.required<ObservabilityRange>();
    readonly openRequests = output<RequestFilters>();

    readonly metrics = loader((range: ObservabilityRange) => this._service.metrics(range));
    readonly sort = { calls: by('calls'), average: by('average_ms'), p95: by('p95_ms'), slowest: by('slowest_ms'), errors: by('error_rate'), client: by('client_errors') };

    constructor() {
        effect(() => {
            const range = this.range();
            untracked(() => this.metrics.run(range));
        });
    }
}
