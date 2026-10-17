import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { PARTNER_PLATFORMS, PARTNER_TYPES } from '@app/core/models/partner.model';
import { PARTNER_ROUTES } from '@app/modules/marketing/partner/constants/partner-routes';

export const PARTNER_STATUS: ToneMap = {
    Active: { label: 'marketing.partner.status.Active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'marketing.partner.status.Inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

export const PARTNER_TYPE_TAG: ToneMap = Object.fromEntries(PARTNER_TYPES.map((type) => [type, { label: `marketing.partner.type.${type}`, tone: 'neutral' as const }]));

export const PARTNER_PLATFORM_TAG: ToneMap = Object.fromEntries(PARTNER_PLATFORMS.map((platform) => [platform, { label: `marketing.partner.platform.${platform}`, tone: 'neutral' as const }]));

export const PARTNER_LIST: ListShellPageConfig = {
    permission: 'marketing.partner.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'marketing.partner.add', icon: 'lucidePlus', permission: 'marketing.partner.create', primary: true, run: { kind: 'navigate', route: PARTNER_ROUTES.create } }],
    },
    stats: [
        { key: 'active', label: 'marketing.partner.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'marketing.partner.stat.inactive', icon: 'lucideCircleDashed' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'marketing.partner.searchPlaceholder' },
        fields: [
            { key: 'partner_type', label: 'marketing.partner.type.label', type: 'multi-select', choices: PARTNER_TYPES.map((value) => ({ value, label: `marketing.partner.type.${value}` })) },
            { key: 'status', label: 'marketing.partner.status.label', type: 'select', choices: [{ value: 'Active', label: 'marketing.partner.status.Active' }, { value: 'Inactive', label: 'marketing.partner.status.Inactive' }] },
        ],
    },
    table: {
        key: 'marketing.partner',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_PARTNER_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'name', label: 'marketing.partner.name', type: 'name', width: 22, sortable: true, locked: true, pin: 'start' },
            { key: 'partner_type', label: 'marketing.partner.type.label', type: 'status', width: 12, sortable: true, tones: PARTNER_TYPE_TAG },
            { key: 'platforms', label: 'marketing.partner.platforms', type: 'tags', width: 20, tones: PARTNER_PLATFORM_TAG },
            { key: 'handle', label: 'marketing.partner.handle', type: 'text', width: 16 },
            { key: 'phone_number', label: 'marketing.partner.phone', type: 'text', width: 14, copy: true },
            { key: 'status', label: 'marketing.partner.status.label', type: 'status', width: 11, sortable: true, tones: PARTNER_STATUS },
            { key: 'last_action_by', label: 'marketing.partner.lastTouched', type: 'user', width: 16, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name', hidden: true },
            { key: 'last_action_on', label: 'marketing.partner.lastTouchedOn', type: 'date', format: 'date', width: 14, sortable: true, sortKey: 'last_action_on', hidden: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'marketing.partner.view', icon: 'lucideEye', permission: 'marketing.partner.view', stateful: false, run: { kind: 'navigate', route: PARTNER_ROUTES.detailPattern } },
            { key: 'edit', label: 'marketing.partner.edit', icon: 'lucidePencil', permission: 'marketing.partner.edit', stateful: false, run: { kind: 'navigate', route: PARTNER_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideUsers', title: 'marketing.partner.emptyTitle', body: 'marketing.partner.emptyBody' },
    },
};
