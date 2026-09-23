import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';

export const CATEGORY_STATUS: ToneMap = {
    Active: { label: 'configuration.category.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'configuration.category.status.inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

/**
 * Categories: the first list on the new shell page, and the config every other one is copied from.
 *
 * Create, view and edit emit rather than navigate, because the category form is the next round and
 * a button that navigates nowhere is worse than one that says so. Swapping each `emit` for a
 * `navigate` is the whole change when the form lands.
 */
export const CATEGORY_LIST: ListShellPageConfig = {
    permission: 'configuration.category.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'configuration.category.add', icon: 'lucidePlus', permission: 'configuration.category.create', primary: true, run: { kind: 'emit' } }],
    },
    stats: [
        { key: 'active', label: 'configuration.category.stat.active', icon: 'lucideCheck', tone: 'success', filter: { status: 'Active' } },
        { key: 'inactive', label: 'configuration.category.stat.inactive', icon: 'lucideCircleDashed', filter: { status: 'Inactive' } },
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
            { key: 'view', label: 'configuration.category.view', icon: 'lucideEye', permission: 'configuration.category.view', stateful: false, run: { kind: 'emit' } },
            { key: 'edit', label: 'configuration.category.edit', icon: 'lucidePencil', permission: 'configuration.category.edit', stateful: false, run: { kind: 'emit' } },
        ],
        empty: { icon: 'lucideFolderTree', title: 'configuration.category.emptyTitle', body: 'configuration.category.emptyBody' },
    },
};
