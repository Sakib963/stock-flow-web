import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { PRODUCT_ROUTES } from '@app/modules/configuration/product/constants/product-routes';

export const PRODUCT_STATUS: ToneMap = {
    Active: { label: 'configuration.product.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'configuration.product.status.inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

/** Products, copied from the Categories list with the photo beside the name and stock as a column. */
export const PRODUCT_LIST: ListShellPageConfig = {
    permission: 'configuration.product.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'configuration.product.add', icon: 'lucidePlus', permission: 'configuration.product.create', primary: true, run: { kind: 'navigate', route: PRODUCT_ROUTES.create } }],
    },
    stats: [
        { key: 'active', label: 'configuration.product.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'configuration.product.stat.inactive', icon: 'lucideCircleDashed' },
        { key: 'low', label: 'configuration.product.stat.low', icon: 'lucideCircleAlert', tone: 'warning' },
        { key: 'out', label: 'configuration.product.stat.out', icon: 'lucideCircleX', tone: 'danger' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'configuration.product.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'configuration.product.status.label',
                type: 'select',
                choices: [
                    { value: 'Active', label: 'configuration.product.status.active' },
                    { value: 'Inactive', label: 'configuration.product.status.inactive' },
                ],
            },
            { key: 'category_oid', label: 'configuration.product.category', type: 'select', choices: { endpoint: APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN } },
            { key: 'brand_oid', label: 'configuration.product.brand', type: 'select', choices: { endpoint: APIEndpoint.GET_BRAND_LIST_FOR_DROPDOWN } },
        ],
    },
    table: {
        key: 'configuration.product',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_PRODUCT_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'name', label: 'configuration.product.name', type: 'name', thumb: 'photo_thumb', sub: 'sku', width: 28, sortable: true, locked: true, pin: 'start' },
            { key: 'sku', label: 'configuration.product.sku', type: 'identifier', copy: true, width: 14, sortable: true, hidden: true },
            { key: 'category_name', label: 'configuration.product.category', type: 'text', width: 18 },
            { key: 'brand_name', label: 'configuration.product.brand', type: 'text', width: 15 },
            // Sellable, not on hand: what an online order already holds is not there to sell again.
            { key: 'sellable', label: 'configuration.product.stock', type: 'stock', restockAt: 'restock_threshold', width: 13, sortable: true, sortKey: 'stock' },
            { key: 'status', label: 'configuration.product.status.label', type: 'status', width: 12, sortable: true, tones: PRODUCT_STATUS },
            { key: 'last_action_by', label: 'configuration.product.lastTouched', type: 'user', width: 16, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name', hidden: true },
            { key: 'last_action_on', label: 'configuration.product.lastTouchedOn', type: 'date', format: 'date', width: 14, sortable: true, sortKey: 'last_action_on' },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'configuration.product.view', icon: 'lucideEye', permission: 'configuration.product.view', stateful: false, run: { kind: 'navigate', route: PRODUCT_ROUTES.detailPattern } },
            { key: 'edit', label: 'configuration.product.edit', icon: 'lucidePencil', permission: 'configuration.product.edit', stateful: false, run: { kind: 'navigate', route: PRODUCT_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucidePackage', title: 'configuration.product.emptyTitle', body: 'configuration.product.emptyBody' },
    },
};
