import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { ROLE_ROUTES } from '@app/modules/administration/role/constants/role-routes';

export const ROLE_STATUS: ToneMap = {
    Active: { label: 'administration.role.status.Active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'administration.role.status.Inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

export const ROLE_LIST: ListShellPageConfig = {
    permission: 'administration.role.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'administration.role.add', icon: 'lucidePlus', permission: 'administration.role.create', primary: true, run: { kind: 'navigate', route: ROLE_ROUTES.create } }],
    },
    stats: [
        { key: 'active', label: 'administration.role.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'administration.role.stat.inactive', icon: 'lucideCircleDashed' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'administration.role.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'administration.role.status.label',
                type: 'select',
                choices: [
                    { value: 'Active', label: 'administration.role.status.Active' },
                    { value: 'Inactive', label: 'administration.role.status.Inactive' },
                ],
            },
        ],
    },
    table: {
        key: 'administration.role',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_ROLE_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'name', label: 'administration.role.name', type: 'name', width: 18, sortable: true, locked: true, pin: 'start' },
            { key: 'description', label: 'administration.role.description', type: 'long-text', width: 26 },
            { key: 'holders', label: 'administration.role.holders', type: 'number', width: 10, sortable: true },
            { key: 'actions', label: 'administration.role.actions', type: 'number', width: 10, sortable: true },
            { key: 'sensitive', label: 'administration.role.sensitiveCount', type: 'number', width: 10 },
            { key: 'status', label: 'administration.role.status.label', type: 'status', width: 11, sortable: true, tones: ROLE_STATUS },
            { key: 'last_action_by', label: 'administration.role.lastTouched', type: 'user', width: 15, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name', hidden: true },
            { key: 'last_action_on', label: 'administration.role.lastTouchedOn', type: 'date', format: 'date', width: 13, sortable: true, sortKey: 'last_action_on' },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'administration.role.view', icon: 'lucideEye', permission: 'administration.role.view', stateful: false, run: { kind: 'navigate', route: ROLE_ROUTES.detailPattern } },
            { key: 'edit', label: 'administration.role.edit', icon: 'lucidePencil', permission: 'administration.role.edit', stateful: false, run: { kind: 'navigate', route: ROLE_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideLock', title: 'administration.role.emptyTitle', body: 'administration.role.emptyBody' },
    },
};
