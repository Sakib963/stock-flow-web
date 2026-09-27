import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { BRAND_ROUTES } from '@app/modules/configuration/brand/constants/brand-routes';

export const BRAND_STATUS: ToneMap = {
    Active: { label: 'configuration.brand.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'configuration.brand.status.inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

export const BRAND_LIST: ListShellPageConfig = {
    permission: 'configuration.brands.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'configuration.brand.add', icon: 'lucidePlus', permission: 'configuration.brands.create', primary: true, run: { kind: 'navigate', route: BRAND_ROUTES.create } }],
    },
    // No `filter` on any of these: a card here reports, it does not narrow the list. The status
    // filter is one click away in the filter itself, and a card that silently changed what the
    // table showed was read as the page breaking rather than as a filter being applied.
    stats: [
        { key: 'active', label: 'configuration.brand.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'configuration.brand.stat.inactive', icon: 'lucideCircleDashed' },
        { key: 'products', label: 'configuration.brand.stat.products', icon: 'lucidePackage' },
        { key: 'empty', label: 'configuration.brand.stat.empty', icon: 'lucideInbox', tone: 'warning' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'configuration.brand.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'configuration.brand.status.label',
                type: 'select',
                choices: [
                    { value: 'Active', label: 'configuration.brand.status.active' },
                    { value: 'Inactive', label: 'configuration.brand.status.inactive' },
                ],
            },
        ],
    },
    table: {
        key: 'configuration.brand',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_BRAND_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'name', label: 'configuration.brand.name', type: 'name', width: 25, sortable: true, locked: true, pin: 'start' },
            { key: 'description', label: 'configuration.brand.description', type: 'long-text', width: 32 },
            { key: 'status', label: 'configuration.brand.status.label', type: 'status', width: 11, sortable: true, tones: BRAND_STATUS },
            { key: 'last_action_by', label: 'configuration.brand.lastTouched', type: 'user', width: 17, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name' },
            { key: 'last_action_on', label: 'configuration.brand.lastTouchedOn', type: 'date', format: 'date', width: 15, sortable: true, sortKey: 'last_action_on' },
            { key: 'created_on', label: 'configuration.brand.created', type: 'date', format: 'date', width: 12, sortable: true, hidden: true },
        ],
        // One layout, on every size. There is no layout switcher any more, so a layout nobody's
        // `phoneLayout` names can never be reached: the cards and grid entries here were drawn on
        // no screen at all.
        layouts: [{ type: 'table' }],
        rowActions: [
            // stateful: false, because a brand has no state that closes either of these off. The
            // permission is the whole gate, and the server checks the same code.
            { key: 'view', label: 'configuration.brand.view', icon: 'lucideEye', permission: 'configuration.brands.view', stateful: false, run: { kind: 'navigate', route: BRAND_ROUTES.detailPattern } },
            { key: 'edit', label: 'configuration.brand.edit', icon: 'lucidePencil', permission: 'configuration.brands.edit', stateful: false, run: { kind: 'navigate', route: BRAND_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideTag', title: 'configuration.brand.emptyTitle', body: 'configuration.brand.emptyBody' },
    },
};
