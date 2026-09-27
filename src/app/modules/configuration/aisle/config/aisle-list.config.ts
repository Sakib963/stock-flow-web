import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { AISLE_ROUTES } from '@app/modules/configuration/aisle/constants/aisle-routes';

export const AISLE_STATUS: ToneMap = {
    Active: { label: 'configuration.aisle.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'configuration.aisle.status.inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

/** Aisles, copied from the Warehouses list with the parent warehouse as a column and a filter. */
export const AISLE_LIST: ListShellPageConfig = {
    permission: 'configuration.aisle.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'configuration.aisle.add', icon: 'lucidePlus', permission: 'configuration.aisle.create', primary: true, run: { kind: 'navigate', route: AISLE_ROUTES.create } }],
    },
    stats: [
        { key: 'active', label: 'configuration.aisle.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'configuration.aisle.stat.inactive', icon: 'lucideCircleDashed' },
        { key: 'stocked', label: 'configuration.aisle.stat.stocked', icon: 'lucidePackage' },
        { key: 'empty', label: 'configuration.aisle.stat.empty', icon: 'lucideInbox', tone: 'warning' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'configuration.aisle.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'configuration.aisle.status.label',
                type: 'select',
                choices: [
                    { value: 'Active', label: 'configuration.aisle.status.active' },
                    { value: 'Inactive', label: 'configuration.aisle.status.inactive' },
                ],
            },
            // Loaded when the filter opens, not with the page, and cached with the form's picker.
            { key: 'warehouse_oid', label: 'configuration.aisle.warehouse', type: 'select', choices: { endpoint: APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN } },
        ],
    },
    table: {
        key: 'configuration.aisle',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_AISLE_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'code', label: 'configuration.aisle.code', type: 'identifier', copy: true, width: 15, sortable: true, locked: true, pin: 'start' },
            { key: 'name', label: 'configuration.aisle.name', type: 'name', sortable: true, width: 22, locked: true },
            { key: 'special_notes', label: 'configuration.aisle.notes', type: 'long-text', width: 25, hidden: true },
            { key: 'warehouse_name', label: 'configuration.aisle.warehouse', type: 'text', copy: true, width: 20, sortable: true },
            { key: 'status', label: 'configuration.aisle.status.label', type: 'status', width: 12, sortable: true, tones: AISLE_STATUS },
            { key: 'last_action_by', label: 'configuration.aisle.lastTouched', type: 'user', width: 16, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name' },
            { key: 'last_action_on', label: 'configuration.aisle.lastTouchedOn', type: 'date', format: 'date', width: 15, sortable: true, sortKey: 'last_action_on' },
            { key: 'created_on', label: 'configuration.aisle.created', type: 'date', format: 'date', width: 12, sortable: true, hidden: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'configuration.aisle.view', icon: 'lucideEye', permission: 'configuration.aisle.view', stateful: false, run: { kind: 'navigate', route: AISLE_ROUTES.detailPattern } },
            { key: 'edit', label: 'configuration.aisle.edit', icon: 'lucidePencil', permission: 'configuration.aisle.edit', stateful: false, run: { kind: 'navigate', route: AISLE_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideRows3', title: 'configuration.aisle.emptyTitle', body: 'configuration.aisle.emptyBody' },
    },
};
