import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { WAREHOUSE_ROUTES } from '@app/modules/configuration/warehouse/constants/warehouse-routes';

export const WAREHOUSE_STATUS: ToneMap = {
    Active: { label: 'configuration.warehouse.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'configuration.warehouse.status.inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

export const WAREHOUSE_LIST: ListShellPageConfig = {
    permission: 'configuration.warehouse.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'configuration.warehouse.add', icon: 'lucidePlus', permission: 'configuration.warehouse.create', primary: true, run: { kind: 'navigate', route: WAREHOUSE_ROUTES.create } }],
    },
    // No `filter` on any of these: a card here reports, it does not narrow the list. The status
    // filter is one click away in the filter itself, and a card that silently changed what the
    // table showed was read as the page breaking rather than as a filter being applied.
    stats: [
        { key: 'active', label: 'configuration.warehouse.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'configuration.warehouse.stat.inactive', icon: 'lucideCircleDashed' },
        { key: 'stocked', label: 'configuration.warehouse.stat.stocked', icon: 'lucidePackage' },
        { key: 'empty', label: 'configuration.warehouse.stat.empty', icon: 'lucideInbox', tone: 'warning' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'configuration.warehouse.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'configuration.warehouse.status.label',
                type: 'select',
                choices: [
                    { value: 'Active', label: 'configuration.warehouse.status.active' },
                    { value: 'Inactive', label: 'configuration.warehouse.status.inactive' },
                ],
            },
        ],
    },
    table: {
        key: 'configuration.warehouse',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_WAREHOUSE_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'code', label: 'configuration.warehouse.code', type: 'identifier', copy: true, width: 13, sortable: true, locked: true, pin: 'start' },
            { key: 'name', label: 'configuration.warehouse.name', type: 'name', width: 20, sortable: true, locked: true },
            { key: 'location', label: 'configuration.warehouse.location', type: 'long-text', width: 27 },
            { key: 'status', label: 'configuration.warehouse.status.label', type: 'status', width: 11, sortable: true, tones: WAREHOUSE_STATUS },
            { key: 'last_action_by', label: 'configuration.warehouse.lastTouched', type: 'user', width: 16, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name' },
            { key: 'last_action_on', label: 'configuration.warehouse.lastTouchedOn', type: 'date', format: 'date', width: 13, sortable: true, sortKey: 'last_action_on' },
            { key: 'created_on', label: 'configuration.warehouse.created', type: 'date', format: 'date', width: 12, sortable: true, hidden: true },
        ],
        // One layout, on every size. There is no layout switcher any more, so a layout nobody's
        // `phoneLayout` names can never be reached: the cards and grid entries here were drawn on
        // no screen at all.
        layouts: [{ type: 'table' }],
        rowActions: [
            // stateful: false, because a warehouse has no state that closes either of these off. The
            // permission is the whole gate, and the server checks the same code.
            { key: 'view', label: 'configuration.warehouse.view', icon: 'lucideEye', permission: 'configuration.warehouse.view', stateful: false, run: { kind: 'navigate', route: WAREHOUSE_ROUTES.detailPattern } },
            { key: 'edit', label: 'configuration.warehouse.edit', icon: 'lucidePencil', permission: 'configuration.warehouse.edit', stateful: false, run: { kind: 'navigate', route: WAREHOUSE_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideWarehouse', title: 'configuration.warehouse.emptyTitle', body: 'configuration.warehouse.emptyBody' },
    },
};
