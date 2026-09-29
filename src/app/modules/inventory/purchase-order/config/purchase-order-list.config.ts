import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { PURCHASE_ORDER_ROUTES } from '@app/modules/inventory/purchase-order/constants/purchase-order-routes';

/** Brand tint while in flight, success once received, the quiet treatment once cancelled. */
export const PURCHASE_ORDER_STATUS: ToneMap = {
    Submitted: { label: 'inventory.purchaseOrder.status.submitted', tone: 'progress', icon: 'lucideSend' },
    Verified: { label: 'inventory.purchaseOrder.status.verified', tone: 'success', icon: 'lucideBadgeCheck' },
    Cancelled: { label: 'inventory.purchaseOrder.status.cancelled', tone: 'neutral', icon: 'lucideBan' },
};

export const PAYMENT_STATUS: ToneMap = {
    paid: { label: 'inventory.purchaseOrder.payment.paid', tone: 'success', icon: 'lucideCheck' },
    partially_paid: { label: 'inventory.purchaseOrder.payment.partially_paid', tone: 'warning', icon: 'lucideHandCoins' },
    unpaid: { label: 'inventory.purchaseOrder.payment.unpaid', tone: 'neutral', icon: 'lucideCircleDashed' },
};

const SUBMITTED = { field: 'status', in: ['Submitted'] } as const;

export const PURCHASE_ORDER_LIST: ListShellPageConfig = {
    permission: 'inventory.purchase-order.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'inventory.purchaseOrder.add', icon: 'lucidePlus', permission: 'inventory.purchase-order.create', primary: true, run: { kind: 'navigate', route: PURCHASE_ORDER_ROUTES.create } }],
    },
    // A card here reports, it does not narrow the list: the status filter is one click away.
    stats: [
        { key: 'submitted', label: 'inventory.purchaseOrder.stat.submitted', icon: 'lucideSend' },
        { key: 'overdue', label: 'inventory.purchaseOrder.stat.overdue', icon: 'lucideClock', tone: 'warning' },
        { key: 'verified', label: 'inventory.purchaseOrder.stat.verified', icon: 'lucideBadgeCheck', tone: 'success' },
        { key: 'cancelled', label: 'inventory.purchaseOrder.stat.cancelled', icon: 'lucideBan' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'inventory.purchaseOrder.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'inventory.purchaseOrder.status.label',
                type: 'select',
                choices: [
                    { value: 'Submitted', label: 'inventory.purchaseOrder.status.submitted' },
                    { value: 'Verified', label: 'inventory.purchaseOrder.status.verified' },
                    { value: 'Cancelled', label: 'inventory.purchaseOrder.status.cancelled' },
                ],
            },
            {
                key: 'payment_status',
                label: 'inventory.purchaseOrder.payment.label',
                type: 'select',
                choices: [
                    { value: 'paid', label: 'inventory.purchaseOrder.payment.paid' },
                    { value: 'partially_paid', label: 'inventory.purchaseOrder.payment.partially_paid' },
                    { value: 'unpaid', label: 'inventory.purchaseOrder.payment.unpaid' },
                ],
            },
            { key: 'supplier_oid', label: 'inventory.purchaseOrder.supplier', type: 'select', choices: { endpoint: APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN } },
        ],
    },
    table: {
        key: 'inventory.purchase-order',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_PURCHASE_ORDER_LIST },
        sort: { key: 'created_on', order: 'desc' },
        open: { route: PURCHASE_ORDER_ROUTES.detailPattern },
        columns: [
            { key: 'po_number', label: 'inventory.purchaseOrder.number', type: 'identifier', width: 14, sortable: true, locked: true, pin: 'start', copy: true },
            { key: 'supplier_name', label: 'inventory.purchaseOrder.supplier', type: 'text', width: 20, sortable: true },
            { key: 'status', label: 'inventory.purchaseOrder.status.label', type: 'status', width: 12, sortable: true, tones: PURCHASE_ORDER_STATUS },
            { key: 'total_amount', label: 'inventory.purchaseOrder.totalColumn', type: 'money', width: 13, sortable: true },
            { key: 'payment_status', label: 'inventory.purchaseOrder.payment.label', type: 'status', width: 13, tones: PAYMENT_STATUS },
            { key: 'expected_delivery_date', label: 'inventory.purchaseOrder.expected', type: 'date', format: 'date', width: 13, sortable: true },
            { key: 'created_on', label: 'inventory.purchaseOrder.raisedOn', type: 'date', format: 'date', width: 15, sortable: true },
            { key: 'paid_amount', label: 'inventory.purchaseOrder.paidColumn', type: 'money', width: 13, hidden: true },
            { key: 'product_count', label: 'inventory.purchaseOrder.productCount', type: 'number', width: 10, hidden: true },
            { key: 'last_action_by', label: 'inventory.purchaseOrder.lastTouched', type: 'user', width: 18, sortable: false, name: 'last_action_by_name', hidden: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'inventory.purchaseOrder.view', icon: 'lucideEye', permission: 'inventory.purchase-order.view', stateful: false, run: { kind: 'navigate', route: PURCHASE_ORDER_ROUTES.detailPattern } },
            // Only a Submitted order can be edited or received. The server refuses the rest whatever this shows.
            { key: 'edit', label: 'inventory.purchaseOrder.edit', icon: 'lucidePencil', permission: 'inventory.purchase-order.edit', stateful: false, when: SUBMITTED, run: { kind: 'navigate', route: PURCHASE_ORDER_ROUTES.editPattern } },
            { key: 'verify', label: 'inventory.purchaseOrder.verify', icon: 'lucidePackageCheck', permission: 'inventory.purchase-order.approve', stateful: false, when: SUBMITTED, run: { kind: 'navigate', route: PURCHASE_ORDER_ROUTES.verifyPattern } },
        ],
        rowActionStyle: 'menu',
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideTruck', title: 'inventory.purchaseOrder.emptyTitle', body: 'inventory.purchaseOrder.emptyBody', action: 'create' },
    },
};
