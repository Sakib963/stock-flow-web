import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideBug, lucideDatabase, lucideGauge, lucideList, lucideShieldAlert } from '@ng-icons/lucide';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { TranslatePipe } from '@ngx-translate/core';
import { FilterConfig, FilterValues } from '@app/core/models/filter.model';
import { ObservabilityRange, RequestFilters } from '@app/core/models/observability.model';
import { CrashesTabComponent } from '@app/modules/system/observability/components/crashes-tab/crashes-tab.component';
import { DatabaseTabComponent } from '@app/modules/system/observability/components/database-tab/database-tab.component';
import { MetricsTabComponent } from '@app/modules/system/observability/components/metrics-tab/metrics-tab.component';
import { RequestsTabComponent } from '@app/modules/system/observability/components/requests-tab/requests-tab.component';
import { SignalsTabComponent } from '@app/modules/system/observability/components/signals-tab/signals-tab.component';
import { UsageTabComponent } from '@app/modules/system/observability/components/usage-tab/usage-tab.component';
import { FilterComponent } from '@app/shared/components/filter/filter.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { addDays, businessToday } from '@app/shared/utils/business-time/business-time';
import { isPhoneWidth, viewportWidth } from '@app/shared/utils/viewport/viewport';

const TABS = [
    { key: 'usage', icon: 'lucideActivity' },
    { key: 'metrics', icon: 'lucideGauge' },
    { key: 'requests', icon: 'lucideList' },
    { key: 'crashes', icon: 'lucideBug' },
    { key: 'signals', icon: 'lucideShieldAlert' },
    { key: 'database', icon: 'lucideDatabase' },
] as const;

@Component({
    selector: 'observability',
    imports: [NgIcon, NzTabsModule, TranslatePipe, FilterComponent, PageHeaderComponent, UsageTabComponent, MetricsTabComponent, RequestsTabComponent, CrashesTabComponent, SignalsTabComponent, DatabaseTabComponent],
    providers: [provideIcons({ lucideActivity, lucideBug, lucideDatabase, lucideGauge, lucideList, lucideShieldAlert })],
    templateUrl: './observability.component.html',
    styleUrl: './observability.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservabilityComponent {
    readonly tabs = TABS;
    readonly isPhone = isPhoneWidth(viewportWidth());
    readonly tab = signal(0);
    readonly filters = signal<FilterValues>({ date_from: addDays(businessToday(), -6), date_to: businessToday() });
    readonly requestFilters = signal<RequestFilters>({});

    readonly filterConfig: FilterConfig = {
        render: 'row',
        fields: [{ key: 'when', label: 'system.health.when', type: 'date-range', fromKey: 'date_from', toKey: 'date_to', presets: ['today', 'yesterday', 'last-7-days', 'last-30-days', 'this-month'], maxDays: 31, max: 'today', required: true }],
    };

    readonly range = computed<ObservabilityRange>(() => ({ date_from: this.filters()['date_from'] ?? businessToday(), date_to: this.filters()['date_to'] ?? businessToday() }));

    openRequests(filters: RequestFilters): void {
        this.requestFilters.set(filters);
        this.tab.set(TABS.findIndex((t) => t.key === 'requests'));
    }
}
