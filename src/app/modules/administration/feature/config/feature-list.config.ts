import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { FEATURE_STATES } from '@app/core/models/feature.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { FEATURE_STATE } from '@app/shared/constants/feature-state';
import { FEATURE_ROUTES } from '@app/modules/administration/feature/constants/feature-routes';

export { FEATURE_STATE };

export const FEATURE_KIND: ToneMap = {
    Module: { label: 'administration.feature.kind.Module', tone: 'neutral' },
    Feature: { label: 'administration.feature.kind.Feature', tone: 'neutral' },
};

export const FEATURE_LIST: ListShellPageConfig = {
    permission: 'system.feature.view',
    header: {
        count: true,
        actions: [
            { key: 'reorder', label: 'administration.feature.reorder.button', icon: 'lucideArrowUpDown', permission: 'system.feature.edit', run: { kind: 'emit' } },
            { key: 'tree', label: 'administration.feature.showTree', icon: 'lucideListTree', permission: 'system.feature.view', run: { kind: 'emit' } },
        ],
    },
    stats: [
        { key: 'on', label: 'administration.feature.stat.on', icon: 'lucideCheck', tone: 'success' },
        { key: 'disabled', label: 'administration.feature.stat.disabled', icon: 'lucideBan' },
        { key: 'hidden', label: 'administration.feature.stat.hidden', icon: 'lucideEyeOff' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'administration.feature.searchPlaceholder' },
        fields: [
            { key: 'state', label: 'administration.feature.state.label', type: 'multi-select', choices: FEATURE_STATES.map((value) => ({ value, label: `system.feature.state.${value}` })) },
            {
                key: 'kind',
                label: 'administration.feature.kind.label',
                type: 'select',
                choices: [
                    { value: 'Module', label: 'administration.feature.kind.Module' },
                    { value: 'Feature', label: 'administration.feature.kind.Feature' },
                ],
            },
        ],
    },
    table: {
        key: 'administration.feature',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_FEATURE_LIST },
        sort: { key: 'position', order: 'asc' },
        columns: [
            { key: 'label', label: 'administration.feature.labelEn', type: 'name', width: 20, sortable: true, locked: true, pin: 'start' },
            { key: 'label_bn', label: 'administration.feature.labelBn', type: 'text', width: 18 },
            { key: 'kind', label: 'administration.feature.kind.label', type: 'status', width: 10, tones: FEATURE_KIND },
            { key: 'module_label', label: 'administration.feature.module', type: 'text', width: 14, sortable: true, sortKey: 'module' },
            { key: 'route', label: 'administration.feature.route', type: 'text', width: 22, copy: true },
            { key: 'state', label: 'administration.feature.state.label', type: 'status', width: 12, sortable: true, tones: FEATURE_STATE },
            { key: 'last_action_by', label: 'administration.feature.lastTouched', type: 'user', width: 16, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name', hidden: true },
            { key: 'last_action_on', label: 'administration.feature.lastTouchedOn', type: 'date', format: 'date', width: 14, sortable: true, sortKey: 'last_action_on', hidden: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'administration.feature.view', icon: 'lucideEye', permission: 'system.feature.view', stateful: false, run: { kind: 'navigate', route: FEATURE_ROUTES.detailPattern } },
            { key: 'edit', label: 'administration.feature.edit', icon: 'lucidePencil', permission: 'system.feature.edit', stateful: false, run: { kind: 'navigate', route: FEATURE_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideListTree', title: 'administration.feature.emptyTitle', body: 'administration.feature.emptyBody' },
    },
};
