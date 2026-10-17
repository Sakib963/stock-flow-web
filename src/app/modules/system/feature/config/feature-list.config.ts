import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { FEATURE_STATES } from '@app/core/models/feature.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { FEATURE_ROUTES } from '@app/modules/system/feature/constants/feature-routes';

export const FEATURE_STATE: ToneMap = {
    On: { label: 'system.feature.state.On', tone: 'success', icon: 'lucideCheck' },
    Disabled: { label: 'system.feature.state.Disabled', tone: 'warning', icon: 'lucideBan' },
    Hidden: { label: 'system.feature.state.Hidden', tone: 'neutral', icon: 'lucideEyeOff' },
};

export const FEATURE_KIND: ToneMap = {
    Module: { label: 'system.feature.kind.Module', tone: 'neutral' },
    Feature: { label: 'system.feature.kind.Feature', tone: 'neutral' },
};

export const FEATURE_LIST: ListShellPageConfig = {
    permission: 'system.feature.view',
    header: { count: true },
    stats: [
        { key: 'on', label: 'system.feature.stat.on', icon: 'lucideCheck', tone: 'success' },
        { key: 'disabled', label: 'system.feature.stat.disabled', icon: 'lucideBan' },
        { key: 'hidden', label: 'system.feature.stat.hidden', icon: 'lucideEyeOff' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'system.feature.searchPlaceholder' },
        fields: [
            { key: 'state', label: 'system.feature.state.label', type: 'multi-select', choices: FEATURE_STATES.map((value) => ({ value, label: `system.feature.state.${value}` })) },
            {
                key: 'kind',
                label: 'system.feature.kind.label',
                type: 'select',
                choices: [
                    { value: 'Module', label: 'system.feature.kind.Module' },
                    { value: 'Feature', label: 'system.feature.kind.Feature' },
                ],
            },
        ],
    },
    table: {
        key: 'system.feature',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_FEATURE_LIST },
        sort: { key: 'position', order: 'asc' },
        columns: [
            { key: 'label', label: 'system.feature.labelEn', type: 'name', width: 20, sortable: true, locked: true, pin: 'start' },
            { key: 'label_bn', label: 'system.feature.labelBn', type: 'text', width: 18 },
            { key: 'kind', label: 'system.feature.kind.label', type: 'status', width: 10, tones: FEATURE_KIND },
            { key: 'module_label', label: 'system.feature.module', type: 'text', width: 14, sortable: true, sortKey: 'module' },
            { key: 'route', label: 'system.feature.route', type: 'text', width: 22, copy: true },
            { key: 'state', label: 'system.feature.state.label', type: 'status', width: 12, sortable: true, tones: FEATURE_STATE },
            { key: 'last_action_by', label: 'system.feature.lastTouched', type: 'user', width: 16, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name', hidden: true },
            { key: 'last_action_on', label: 'system.feature.lastTouchedOn', type: 'date', format: 'date', width: 14, sortable: true, sortKey: 'last_action_on', hidden: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'system.feature.view', icon: 'lucideEye', permission: 'system.feature.view', stateful: false, run: { kind: 'navigate', route: FEATURE_ROUTES.detailPattern } },
            { key: 'edit', label: 'system.feature.edit', icon: 'lucidePencil', permission: 'system.feature.edit', stateful: false, run: { kind: 'navigate', route: FEATURE_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideListTree', title: 'system.feature.emptyTitle', body: 'system.feature.emptyBody' },
    },
};
