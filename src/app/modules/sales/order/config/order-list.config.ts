import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { ORDER_ROUTES } from '@app/modules/sales/order/constants/order-routes';

export const ORDER_STATUS: ToneMap = {
    Pending: { label: 'sales.order.status.Pending', tone: 'warning', icon: 'lucideClock' },
    Confirmed: { label: 'sales.order.status.Confirmed', tone: 'progress', icon: 'lucideCircleCheck' },
    Purchased: { label: 'sales.order.status.Purchased', tone: 'success', icon: 'lucideCheck' },
    Delivered: { label: 'sales.order.status.Delivered', tone: 'success', icon: 'lucidePackageCheck' },
    PartiallyReturned: { label: 'sales.order.status.PartiallyReturned', tone: 'warning', icon: 'lucideUndo2' },
    Returned: { label: 'sales.order.status.Returned', tone: 'neutral', icon: 'lucideUndo2' },
    Cancelled: { label: 'sales.order.status.Cancelled', tone: 'danger', icon: 'lucideX' },
    Refunded: { label: 'sales.order.status.Refunded', tone: 'neutral', icon: 'lucideUndo2' },
};

export const DELIVERY_STATUS: ToneMap = {
    Preparing: { label: 'sales.order.delivery.Preparing', tone: 'neutral', icon: 'lucidePackage' },
    Packed: { label: 'sales.order.delivery.Packed', tone: 'progress', icon: 'lucidePackage' },
    WithCourier: { label: 'sales.order.delivery.WithCourier', tone: 'progress', icon: 'lucideTruck' },
    Delivered: { label: 'sales.order.delivery.Delivered', tone: 'success', icon: 'lucidePackageCheck' },
    Failed: { label: 'sales.order.delivery.Failed', tone: 'danger', icon: 'lucidePackageX' },
    BackInShop: { label: 'sales.order.delivery.BackInShop', tone: 'neutral', icon: 'lucideStore' },
};

export const PAYMENT_STATUS: ToneMap = {
    unpaid: { label: 'sales.order.payment.unpaid', tone: 'warning', icon: 'lucideCircleDashed' },
    partially_paid: { label: 'sales.order.payment.partially_paid', tone: 'progress', icon: 'lucideCircleDot' },
    paid: { label: 'sales.order.payment.paid', tone: 'success', icon: 'lucideCheck' },
    partially_refunded: { label: 'sales.order.payment.partially_refunded', tone: 'neutral', icon: 'lucideUndo2' },
    refunded: { label: 'sales.order.payment.refunded', tone: 'neutral', icon: 'lucideUndo2' },
};

export const ORDER_CHANNEL: ToneMap = {
    POS: { label: 'sales.order.channel.POS', tone: 'neutral', icon: 'lucideStore' },
    ONLINE: { label: 'sales.order.channel.ONLINE', tone: 'neutral', icon: 'lucideGlobe' },
};

/**
 * The orders list. The channel filter and column appear only to someone with both channels
 * (sales REQ-03), and someone who cannot confirm orders opens it on their own orders, so a
 * salesperson sees their invoices first and the owner sees everyone's.
 */
export const orderList = ({ bothChannels, ownFirst }: { bothChannels: boolean; ownFirst: boolean }): ListShellPageConfig => ({
    permission: 'sales.order.view',
    header: { count: true },
    stats: [
        { key: 'pending', label: 'sales.order.stat.pending', icon: 'lucideClock', tone: 'warning' },
        { key: 'to_dispatch', label: 'sales.order.stat.toDispatch', icon: 'lucidePackage' },
        { key: 'with_courier', label: 'sales.order.stat.withCourier', icon: 'lucideTruck' },
        { key: 'to_refund', label: 'sales.order.stat.toRefund', icon: 'lucideHandCoins', tone: 'danger' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'sales.order.searchPlaceholder' },
        fields: [
            { key: 'mine', label: 'sales.order.takenBy', type: 'select', choices: [{ value: 'true', label: 'sales.order.onlyMine' }], ...(ownFirst ? { default: 'true' } : {}) },
            ...(bothChannels ? [{ key: 'channel', label: 'sales.order.channelLabel', type: 'select' as const, choices: ['POS', 'ONLINE'].map((value) => ({ value, label: `sales.order.channel.${value}` })) }] : []),
            { key: 'status', label: 'sales.order.statusLabel', type: 'multi-select', choices: Object.keys(ORDER_STATUS).map((value) => ({ value, label: `sales.order.status.${value}` })) },
            { key: 'delivery_status', label: 'sales.order.deliveryLabel', type: 'multi-select', choices: Object.keys(DELIVERY_STATUS).map((value) => ({ value, label: `sales.order.delivery.${value}` })) },
            { key: 'payment_status', label: 'sales.order.paymentLabel', type: 'multi-select', choices: Object.keys(PAYMENT_STATUS).map((value) => ({ value, label: `sales.order.payment.${value}` })) },
            { key: 'refund_status', label: 'sales.order.refundLabel', type: 'select', choices: ['ToRefund', 'Refunded'].map((value) => ({ value, label: `sales.order.refund.${value}` })) },
        ],
    },
    table: {
        key: 'sales.order',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_ORDER_LIST },
        sort: { key: 'created_on', order: 'desc' },
        columns: [
            { key: 'invoice_no', label: 'sales.order.invoice', type: 'identifier', width: 15, sortable: true, locked: true, pin: 'start', copy: true },
            { key: 'customer_name', label: 'sales.order.customer', type: 'name', sub: 'customer_phone', width: 18 },
            ...(bothChannels ? [{ key: 'channel', label: 'sales.order.channelLabel', type: 'status' as const, width: 11, tones: ORDER_CHANNEL }] : []),
            { key: 'status', label: 'sales.order.statusLabel', type: 'status', width: 13, tones: ORDER_STATUS },
            { key: 'delivery_status', label: 'sales.order.deliveryLabel', type: 'status', width: 15, tones: DELIVERY_STATUS },
            { key: 'payment_status', label: 'sales.order.paymentLabel', type: 'status', width: 13, tones: PAYMENT_STATUS },
            { key: 'total_amount', label: 'sales.order.total', type: 'money', width: 12, sortable: true },
            { key: 'units', label: 'sales.order.units', type: 'quantity', width: 8 },
            { key: 'created_by', label: 'sales.order.takenBy', type: 'user', name: 'created_by_name', width: 15 },
            { key: 'created_on', label: 'sales.order.placedOn', type: 'date', format: 'date-time-12', width: 15, sortable: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [{ key: 'view', label: 'sales.order.view', icon: 'lucideEye', permission: 'sales.order.view', stateful: false, run: { kind: 'navigate', route: ORDER_ROUTES.detailPattern } }],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideReceipt', title: 'sales.order.emptyTitle', body: 'sales.order.emptyBody' },
    },
});
