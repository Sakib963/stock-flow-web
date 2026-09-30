import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { STOCK_OVERVIEW_ROUTES } from '@app/modules/inventory/stock-overview/constants/stock-overview-routes';

/** Money is sent only to someone holding this, so its columns and figures are drawn only for them. */
export const STOCK_VALUE = 'inventory.stock-value.view';

export const STOCK_STATUS: ToneMap = {
    in: { label: 'inventory.stockOverview.status.in', tone: 'success', icon: 'lucideCheck' },
    low: { label: 'inventory.stockOverview.status.low', tone: 'warning', icon: 'lucideCircleAlert' },
    out: { label: 'inventory.stockOverview.status.out', tone: 'danger', icon: 'lucideCircleX' },
};

export const EXPIRY_STATE: ToneMap = {
    expired: { label: 'inventory.expiry.expired', tone: 'danger', icon: 'lucideCalendarX' },
    soon: { label: 'inventory.expiry.soon', tone: 'warning', icon: 'lucideCalendarClock' },
};

/** Every product with stock, its value and what it would earn. The one row action is View. */
export const STOCK_OVERVIEW_LIST: ListShellPageConfig = {
    permission: 'inventory.overview.view',
    header: { count: true },
    // The list shows four figures. Money first, so an owner sees value, revenue, profit and units, and
    // someone without the stock value permission sees units, low, out and expiring instead.
    stats: [
        { key: 'stock_value', label: 'inventory.stockOverview.stat.stockValue', icon: 'lucideWallet', format: 'money', permission: STOCK_VALUE },
        { key: 'expected_revenue', label: 'inventory.stockOverview.stat.revenue', icon: 'lucideBanknote', format: 'money', permission: STOCK_VALUE },
        { key: 'profit_full', label: 'inventory.stockOverview.stat.profit', icon: 'lucideTrendingUp', format: 'money', tone: 'success', permission: STOCK_VALUE },
        { key: 'on_hand', label: 'inventory.stockOverview.stat.onHand', icon: 'lucidePackage' },
        { key: 'low', label: 'inventory.stockOverview.stat.low', icon: 'lucideCircleAlert', tone: 'warning', filter: { stock_status: 'low' } },
        { key: 'out', label: 'inventory.stockOverview.stat.out', icon: 'lucideCircleX', tone: 'danger', filter: { stock_status: 'out' } },
        { key: 'expiring_units', label: 'inventory.stockOverview.stat.expiring', icon: 'lucideCalendarClock', tone: 'warning', filter: { expiry_state: 'expired,soon' } },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'inventory.stockOverview.searchPlaceholder' },
        fields: [
            {
                key: 'stock_status',
                label: 'inventory.stockOverview.status.label',
                type: 'multi-select',
                choices: Object.keys(STOCK_STATUS).map((value) => ({ value, label: `inventory.stockOverview.status.${value}` })),
            },
            {
                key: 'expiry_state',
                label: 'inventory.expiry.label',
                type: 'multi-select',
                choices: [
                    { value: 'expired', label: 'inventory.expiry.expired' },
                    { value: 'soon', label: 'inventory.expiry.soon' },
                ],
            },
            { key: 'category_oid', label: 'inventory.stockOverview.category', type: 'select', choices: { endpoint: APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN } },
            { key: 'sub_category_oid', label: 'inventory.stockOverview.subCategory', type: 'select', choices: { endpoint: APIEndpoint.GET_SUB_CATEGORY_LIST_FOR_DROPDOWN } },
            { key: 'brand_oid', label: 'inventory.stockOverview.brand', type: 'select', choices: { endpoint: APIEndpoint.GET_BRAND_LIST_FOR_DROPDOWN } },
        ],
    },
    table: {
        key: 'inventory.stock-overview',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_STOCK_OVERVIEW_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'name', label: 'inventory.stockOverview.product', type: 'name', thumb: 'photo_thumb', sub: 'sku', width: 20, sortable: true, locked: true, pin: 'start' },
            { key: 'category_name', label: 'inventory.stockOverview.category', type: 'text', width: 8 },
            { key: 'on_hand', label: 'inventory.stockOverview.onHand', type: 'number', width: 7, sortable: true },
            // Sellable, not on hand: what an online order already holds is not there to sell again.
            { key: 'sellable', label: 'inventory.stockOverview.sellable', type: 'stock', restockAt: 'restock_threshold', width: 9, sortable: true },
            { key: 'held', label: 'inventory.stockOverview.held', type: 'number', width: 7, hidden: true },
            { key: 'batches', label: 'inventory.stockOverview.batches', type: 'number', width: 6, sortable: true },
            { key: 'stock_status', label: 'inventory.stockOverview.status.label', type: 'status', tones: STOCK_STATUS, width: 9 },
            { key: 'expiry_state', label: 'inventory.expiry.label', type: 'status', tones: EXPIRY_STATE, width: 9 },
            { key: 'stock_value', label: 'inventory.stockOverview.stockValue', type: 'money', width: 10, sortable: true, permission: STOCK_VALUE },
            { key: 'expected_revenue', label: 'inventory.stockOverview.revenueShort', type: 'money', width: 11, sortable: true, permission: STOCK_VALUE },
            { key: 'profit_full', label: 'inventory.stockOverview.profit', type: 'money', width: 11, sortable: true, permission: STOCK_VALUE },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [{ key: 'view', label: 'inventory.stockOverview.view', icon: 'lucideEye', permission: 'inventory.overview.view', stateful: false, run: { kind: 'navigate', route: STOCK_OVERVIEW_ROUTES.productPattern } }],
        rowActionStyle: 'inline',
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucidePackage', title: 'inventory.stockOverview.emptyTitle', body: 'inventory.stockOverview.emptyBody' },
    },
};
