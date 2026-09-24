import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { CATEGORY_ROUTES } from '@app/modules/configuration/category/constants/category-routes';

export const CATEGORY_STATUS: ToneMap = {
    Active: { label: 'configuration.category.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'configuration.category.status.inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

/**
 * Categories: the first list on the new shell page, and the config every other one is copied from.
 */
export const CATEGORY_LIST: ListShellPageConfig = {
    permission: 'configuration.category.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'configuration.category.add', icon: 'lucidePlus', permission: 'configuration.category.create', primary: true, run: { kind: 'navigate', route: CATEGORY_ROUTES.create } }],
    },
    // No `filter` on any of these: a card here reports, it does not narrow the list. The status
    // filter is one click away in the filter itself, and a card that silently changed what the
    // table showed was read as the page breaking rather than as a filter being applied.
    stats: [
        { key: 'active', label: 'configuration.category.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'configuration.category.stat.inactive', icon: 'lucideCircleDashed' },
        { key: 'products', label: 'configuration.category.stat.products', icon: 'lucidePackage' },
        { key: 'empty', label: 'configuration.category.stat.empty', icon: 'lucideInbox', tone: 'warning' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'configuration.category.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'configuration.category.status.label',
                type: 'select',
                choices: [
                    { value: 'Active', label: 'configuration.category.status.active' },
                    { value: 'Inactive', label: 'configuration.category.status.inactive' },
                ],
            },
        ],
    },
    table: {
        key: 'configuration.category',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_CATEGORY_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'category_code', label: 'configuration.category.code', type: 'identifier', width: 110, sortable: true, locked: true, pin: 'start' },
            { key: 'name', label: 'configuration.category.name', type: 'name', width: 200, sortable: true, locked: true },
            // The slack column: a description is the one value here with no natural width, and it is
            // the first thing to cut short rather than the name it belongs to.
            { key: 'description', label: 'configuration.category.description', type: 'long-text' },
            { key: 'status', label: 'configuration.category.status.label', type: 'status', width: 120, sortable: true, tones: CATEGORY_STATUS },
            { key: 'last_action_by', label: 'configuration.category.lastTouched', type: 'user', width: 170, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name' },
            { key: 'last_action_on', label: 'configuration.category.lastTouchedOn', type: 'date', format: 'date', width: 120, sortable: true, sortKey: 'last_action_on' },
            { key: 'created_on', label: 'configuration.category.created', type: 'date', format: 'date', width: 120, sortable: true, hidden: true },
        ],
        // One layout, on every size. There is no layout switcher any more, so a layout nobody's
        // `phoneLayout` names can never be reached: the cards and grid entries here were drawn on
        // no screen at all.
        layouts: [{ type: 'table' }],
        rowActions: [
            // stateful: false, because a category has no state that closes either of these off. The
            // permission is the whole gate, and the server checks the same code.
            { key: 'view', label: 'configuration.category.view', icon: 'lucideEye', permission: 'configuration.category.view', stateful: false, run: { kind: 'navigate', route: CATEGORY_ROUTES.detailPattern } },
            { key: 'edit', label: 'configuration.category.edit', icon: 'lucidePencil', permission: 'configuration.category.edit', stateful: false, run: { kind: 'navigate', route: CATEGORY_ROUTES.editPattern } },
        ],
        empty: { icon: 'lucideFolderTree', title: 'configuration.category.emptyTitle', body: 'configuration.category.emptyBody' },
    },
};
