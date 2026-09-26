import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { SUB_CATEGORY_ROUTES } from '@app/modules/configuration/sub-category/constants/sub-category-routes';

export const SUB_CATEGORY_STATUS: ToneMap = {
    Active: { label: 'configuration.subCategory.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'configuration.subCategory.status.inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

/** Sub-categories, copied from the Categories list with the parent category as a column and a filter. */
export const SUB_CATEGORY_LIST: ListShellPageConfig = {
    permission: 'configuration.sub-category.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'configuration.subCategory.add', icon: 'lucidePlus', permission: 'configuration.sub-category.create', primary: true, run: { kind: 'navigate', route: SUB_CATEGORY_ROUTES.create } }],
    },
    stats: [
        { key: 'active', label: 'configuration.subCategory.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'configuration.subCategory.stat.inactive', icon: 'lucideCircleDashed' },
        { key: 'products', label: 'configuration.subCategory.stat.products', icon: 'lucidePackage' },
        { key: 'empty', label: 'configuration.subCategory.stat.empty', icon: 'lucideInbox', tone: 'warning' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'configuration.subCategory.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'configuration.subCategory.status.label',
                type: 'select',
                choices: [
                    { value: 'Active', label: 'configuration.subCategory.status.active' },
                    { value: 'Inactive', label: 'configuration.subCategory.status.inactive' },
                ],
            },
            // Loaded when the filter opens, not with the page, and cached with the form's picker.
            { key: 'category_oid', label: 'configuration.subCategory.category', type: 'select', choices: { endpoint: APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN } },
        ],
    },
    table: {
        key: 'configuration.sub-category',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_SUB_CATEGORY_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'category_code', label: 'configuration.subCategory.code', type: 'identifier', copy: true, width: 15, sortable: true, locked: true, pin: 'start' },
            { key: 'name', label: 'configuration.subCategory.name', type: 'name', sortable: true, width: 22, locked: true },
            { key: 'description', label: 'configuration.subCategory.description', type: 'long-text', width: 25, hidden: true },
            { key: 'category_name', label: 'configuration.subCategory.category', type: 'text', copy: true, width: 20, sortable: true },
            { key: 'status', label: 'configuration.subCategory.status.label', type: 'status', width: 12, sortable: true, tones: SUB_CATEGORY_STATUS },
            { key: 'last_action_by', label: 'configuration.subCategory.lastTouched', type: 'user', width: 16, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name' },
            { key: 'last_action_on', label: 'configuration.subCategory.lastTouchedOn', type: 'date', format: 'date', width: 15, sortable: true, sortKey: 'last_action_on' },
            { key: 'created_on', label: 'configuration.subCategory.created', type: 'date', format: 'date', width: 12, sortable: true, hidden: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'configuration.subCategory.view', icon: 'lucideEye', permission: 'configuration.sub-category.view', stateful: false, run: { kind: 'navigate', route: SUB_CATEGORY_ROUTES.detailPattern } },
            { key: 'edit', label: 'configuration.subCategory.edit', icon: 'lucidePencil', permission: 'configuration.sub-category.edit', stateful: false, run: { kind: 'navigate', route: SUB_CATEGORY_ROUTES.editPattern } },
        ],
        empty: { icon: 'lucideFolderTree', title: 'configuration.subCategory.emptyTitle', body: 'configuration.subCategory.emptyBody' },
    },
};
