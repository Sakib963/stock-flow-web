import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { SUPPLIER_ROUTES } from '@app/modules/configuration/supplier/constants/supplier-routes';

export const SUPPLIER_STATUS: ToneMap = {
    Active: { label: 'configuration.supplier.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'configuration.supplier.status.inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

export const SUPPLIER_LIST: ListShellPageConfig = {
    permission: 'configuration.supplier.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'configuration.supplier.add', icon: 'lucidePlus', permission: 'configuration.supplier.create', primary: true, run: { kind: 'navigate', route: SUPPLIER_ROUTES.create } }],
    },
    // No `filter` on any of these: a card here reports, it does not narrow the list. The status
    // filter is one click away in the filter itself, and a card that silently changed what the
    // table showed was read as the page breaking rather than as a filter being applied.
    stats: [
        { key: 'active', label: 'configuration.supplier.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'configuration.supplier.stat.inactive', icon: 'lucideCircleDashed' },
        { key: 'owing', label: 'configuration.supplier.stat.owing', icon: 'lucideHandCoins', tone: 'warning' },
        { key: 'unused', label: 'configuration.supplier.stat.unused', icon: 'lucideInbox' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'configuration.supplier.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'configuration.supplier.status.label',
                type: 'select',
                choices: [
                    { value: 'Active', label: 'configuration.supplier.status.active' },
                    { value: 'Inactive', label: 'configuration.supplier.status.inactive' },
                ],
            },
        ],
    },
    table: {
        key: 'configuration.supplier',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_SUPPLIER_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'name', label: 'configuration.supplier.name', type: 'name', width: 23, sortable: true, locked: true, pin: 'start' },
            { key: 'contact_person', label: 'configuration.supplier.contactPerson', type: 'text', width: 17, sortable: true },
            { key: 'phone_number', label: 'configuration.supplier.phone', type: 'text', width: 15, copy: true },
            { key: 'status', label: 'configuration.supplier.status.label', type: 'status', width: 11, sortable: true, tones: SUPPLIER_STATUS },
            { key: 'last_action_by', label: 'configuration.supplier.lastTouched', type: 'user', width: 18, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name' },
            { key: 'last_action_on', label: 'configuration.supplier.lastTouchedOn', type: 'date', format: 'date', width: 16, sortable: true, sortKey: 'last_action_on' },
            { key: 'whatsapp_number', label: 'configuration.supplier.whatsapp', type: 'text', width: 15, copy: true, hidden: true },
            { key: 'email', label: 'configuration.supplier.email', type: 'text', width: 20, hidden: true },
            { key: 'created_on', label: 'configuration.supplier.created', type: 'date', format: 'date', width: 12, sortable: true, hidden: true },
        ],
        // One layout, on every size. There is no layout switcher any more, so a layout nobody's
        // `phoneLayout` names can never be reached: the cards and grid entries here were drawn on
        // no screen at all.
        layouts: [{ type: 'table' }],
        rowActions: [
            // stateful: false, because a supplier has no state that closes either of these off. The
            // permission is the whole gate, and the server checks the same code.
            { key: 'view', label: 'configuration.supplier.view', icon: 'lucideEye', permission: 'configuration.supplier.view', stateful: false, run: { kind: 'navigate', route: SUPPLIER_ROUTES.detailPattern } },
            { key: 'edit', label: 'configuration.supplier.edit', icon: 'lucidePencil', permission: 'configuration.supplier.edit', stateful: false, run: { kind: 'navigate', route: SUPPLIER_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideTruck', title: 'configuration.supplier.emptyTitle', body: 'configuration.supplier.emptyBody' },
    },
};
