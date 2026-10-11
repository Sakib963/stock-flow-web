import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { PRE_ORDER_ROUTES } from '@app/modules/sales/pre-order/constants/pre-order-routes';

export const PRE_ORDER_STATUS: ToneMap = {
    Pending: { label: 'sales.preOrder.status.Pending', tone: 'warning', icon: 'lucideClock' },
    Confirmed: { label: 'sales.preOrder.status.Confirmed', tone: 'progress', icon: 'lucideCalendarCheck' },
    Converted: { label: 'sales.preOrder.status.Converted', tone: 'success', icon: 'lucideBadgeCheck' },
    Cancelled: { label: 'sales.preOrder.status.Cancelled', tone: 'neutral', icon: 'lucideX' },
};

export const PRE_ORDER_LIST: ListShellPageConfig = {
    permission: 'sales.pre-order.view',
    header: {
        count: true,
        actions: [
            { key: 'by-product', label: 'sales.preOrder.byProduct.button', icon: 'lucidePackage', permission: 'sales.pre-order.view', run: { kind: 'navigate', route: PRE_ORDER_ROUTES.byProduct } },
            { key: 'create', label: 'sales.preOrder.add', icon: 'lucidePlus', permission: 'sales.pre-order.create', primary: true, run: { kind: 'navigate', route: PRE_ORDER_ROUTES.create } },
        ],
    },
    stats: [
        { key: 'open', label: 'sales.preOrder.stat.open', icon: 'lucideCalendarClock' },
        { key: 'ready', label: 'sales.preOrder.stat.ready', icon: 'lucidePackageCheck', tone: 'success' },
        { key: 'overdue', label: 'sales.preOrder.stat.overdue', icon: 'lucideCalendarX', tone: 'warning' },
        { key: 'advance_held', label: 'sales.preOrder.stat.advance', icon: 'lucideWallet', format: 'money' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'sales.preOrder.searchPlaceholder' },
        fields: [
            { key: 'status', label: 'sales.preOrder.statusLabel', type: 'multi-select', choices: Object.keys(PRE_ORDER_STATUS).map((value) => ({ value, label: `sales.preOrder.status.${value}` })) },
            { key: 'ready', label: 'sales.preOrder.readyFilter', type: 'toggle' },
            { key: 'overdue', label: 'sales.preOrder.overdueFilter', type: 'toggle' },
        ],
    },
    table: {
        key: 'sales.pre-order',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_PRE_ORDER_LIST },
        sort: { key: 'created_on', order: 'desc' },
        columns: [
            { key: 'preorder_no', label: 'sales.preOrder.number', type: 'identifier', width: 16, sortable: true, locked: true, pin: 'start', copy: true },
            { key: 'customer_name', label: 'sales.preOrder.customer', type: 'name', sub: 'customer_phone', width: 18 },
            { key: 'status', label: 'sales.preOrder.statusLabel', type: 'status', width: 12, tones: PRE_ORDER_STATUS },
            { key: 'ready', label: 'sales.preOrder.ready', type: 'boolean', yes: 'sales.preOrder.readyYes', no: 'sales.preOrder.readyNo', width: 10 },
            { key: 'units', label: 'sales.order.units', type: 'quantity', width: 8 },
            { key: 'total_amount', label: 'sales.preOrder.approxTotal', type: 'money', width: 15 },
            { key: 'advance_paid', label: 'sales.preOrder.advance', type: 'money', width: 12 },
            { key: 'expected_date', label: 'sales.preOrder.expected', type: 'date', format: 'date', width: 12, sortable: true },
            { key: 'created_on', label: 'sales.preOrder.bookedOn', type: 'date', format: 'date-time-12', width: 18, sortable: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [{ key: 'view', label: 'sales.order.view', icon: 'lucideEye', permission: 'sales.pre-order.view', stateful: false, run: { kind: 'navigate', route: PRE_ORDER_ROUTES.detailPattern } }],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideCalendarClock', title: 'sales.preOrder.emptyTitle', body: 'sales.preOrder.emptyBody' },
    },
};
