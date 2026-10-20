import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { ActionEvent } from '@app/core/models/config.model';
import { FilterConfig, FilterValues } from '@app/core/models/filter.model';
import { ObservabilityRange, RequestFilters } from '@app/core/models/observability.model';
import { REQUEST_LIST } from '@app/modules/system/observability/config/request-list.config';
import { RequestDrawerComponent } from '@app/modules/system/observability/components/request-drawer/request-drawer.component';
import { FilterComponent } from '@app/shared/components/filter/filter.component';
import { TableComponent } from '@app/shared/components/table/table.component';
import { isPhoneWidth, viewportWidth } from '@app/shared/utils/viewport/viewport';

const FILTERS: FilterConfig = {
    render: 'row',
    fields: [
        { key: 'person', label: 'system.health.requests.person', placeholder: 'system.health.requests.personPlaceholder', type: 'text' },
        { key: 'status', label: 'system.health.requests.status', type: 'select', choices: ['2xx', '3xx', '4xx', '5xx'].map((value) => ({ value, label: `system.health.requests.statusClass.${value}` })) },
        { key: 'route', label: 'system.health.requests.route', placeholder: 'system.health.requests.routePlaceholder', type: 'text' },
        { key: 'ip', label: 'system.health.requests.ip', placeholder: 'system.health.requests.ipPlaceholder', type: 'text' },
        { key: 'request_id', label: 'system.health.requests.requestId', placeholder: 'system.health.requests.requestIdPlaceholder', type: 'text' },
    ],
};

@Component({
    selector: 'requests-tab',
    imports: [FilterComponent, TableComponent, RequestDrawerComponent],
    templateUrl: './requests-tab.component.html',
    styleUrl: './requests-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestsTabComponent {
    readonly range = input.required<ObservabilityRange>();
    readonly filters = model<RequestFilters>({});

    readonly config = FILTERS;
    readonly table = REQUEST_LIST;
    readonly isPhone = isPhoneWidth(viewportWidth());
    readonly opened = signal<string | null>(null);

    readonly values = computed<FilterValues>(() => ({ person: null, status: null, route: null, ip: null, request_id: null, ...this.filters() }));
    readonly context = computed(() => ({ ...this.values(), ...this.range() }));

    pick(values: FilterValues): void {
        const next = Object.fromEntries(Object.entries(values).filter(([, value]) => !!value)) as RequestFilters;
        if (JSON.stringify(next) !== JSON.stringify(this.filters())) this.filters.set(next);
    }

    onAction(event: ActionEvent): void {
        if (event.action.key === 'open') this.opened.set(String(event.rows[0]?.['oid'] ?? ''));
    }
}
