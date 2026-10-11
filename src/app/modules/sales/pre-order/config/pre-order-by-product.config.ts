import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { PRE_ORDER_ROUTES } from '@app/modules/sales/pre-order/constants/pre-order-routes';

/** What the owner buys from (pre-order REQ-13): units on open bookings per product, against what can be sold now. */
export const PRE_ORDER_BY_PRODUCT: ListShellPageConfig = {
    permission: 'sales.pre-order.view',
    header: {
        title: 'sales.preOrder.byProduct.title',
        lead: 'sales.preOrder.byProduct.lead',
        breadcrumb: [{ label: 'sales.preOrder.listTitle', route: PRE_ORDER_ROUTES.list }, { label: 'sales.preOrder.byProduct.title' }],
        count: true,
        actions: [{ key: 'by-booking', label: 'sales.preOrder.byProduct.back', icon: 'lucideCalendarClock', permission: 'sales.pre-order.view', primary: true, run: { kind: 'navigate', route: PRE_ORDER_ROUTES.list } }],
    },
    stats: [
        { key: 'products', label: 'sales.preOrder.byProduct.stat.products', icon: 'lucidePackage' },
        { key: 'units', label: 'sales.preOrder.byProduct.stat.units', icon: 'lucideCalendarClock' },
        { key: 'to_get', label: 'sales.preOrder.byProduct.stat.toGet', icon: 'lucideTruck', tone: 'warning' },
    ],
    filter: { render: 'modal', search: { placeholder: 'sales.preOrder.byProduct.searchPlaceholder' }, fields: [] },
    table: {
        key: 'sales.pre-order.by-product',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_PRE_ORDERS_BY_PRODUCT },
        sort: { key: 'units', order: 'desc' },
        columns: [
            { key: 'product_name', label: 'sales.preOrder.byProduct.product', type: 'name', sub: 'sku', width: 18, sortable: true, locked: true, pin: 'start' },
            { key: 'units', label: 'sales.preOrder.byProduct.units', type: 'quantity', width: 12, sortable: true },
            { key: 'bookings', label: 'sales.preOrder.byProduct.bookings', type: 'quantity', width: 10 },
            { key: 'sellable', label: 'sales.preOrder.byProduct.sellable', type: 'quantity', width: 12 },
            { key: 'to_get', label: 'sales.preOrder.byProduct.toGet', type: 'quantity', width: 12, sortable: true },
            { key: 'oldest', label: 'sales.preOrder.byProduct.oldest', type: 'date', format: 'date', width: 14, sortable: true },
        ],
        layouts: [{ type: 'table' }],
        empty: { icon: 'lucidePackage', title: 'sales.preOrder.byProduct.emptyTitle', body: 'sales.preOrder.byProduct.emptyBody' },
    },
};
