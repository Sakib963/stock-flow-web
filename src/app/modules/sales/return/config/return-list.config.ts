import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { RETURN_REASONS } from '@app/core/models/return.model';
import { ORDER_CHANNEL } from '@app/modules/sales/order/config/order-list.config';
import { RETURN_ROUTES } from '@app/modules/sales/return/constants/return-routes';

export const RETURN_STATUS: ToneMap = {
    Pending: { label: 'sales.return.status.Pending', tone: 'warning', icon: 'lucideClock' },
    Returned: { label: 'sales.return.status.Returned', tone: 'success', icon: 'lucideCheck' },
    Cancelled: { label: 'sales.return.status.Cancelled', tone: 'neutral', icon: 'lucideX' },
};

const ALL_REASONS = [...RETURN_REASONS, 'not_delivered'] as const;

export const RETURN_REASON: ToneMap = Object.fromEntries(ALL_REASONS.map((reason) => [reason, { label: `sales.return.reason.${reason}`, tone: reason === 'not_delivered' ? 'danger' : 'neutral', icon: reason === 'not_delivered' ? 'lucidePackageX' : 'lucideUndo2' }]));

/** The returns of the person's channels; the channel filter and column only for someone with both (sales REQ-03). */
export const returnList = ({ bothChannels }: { bothChannels: boolean }): ListShellPageConfig => ({
    permission: 'sales.return.view',
    header: { count: true },
    stats: [
        { key: 'pending', label: 'sales.return.stat.pending', icon: 'lucideClock', tone: 'warning' },
        { key: 'parcels_to_receive', label: 'sales.return.stat.parcels', icon: 'lucidePackageX' },
        { key: 'units_this_month', label: 'sales.return.stat.units', icon: 'lucideUndo2' },
        { key: 'damaged_this_month', label: 'sales.return.stat.damaged', icon: 'lucideTrash2', tone: 'danger' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'sales.return.searchPlaceholder' },
        fields: [
            ...(bothChannels ? [{ key: 'channel', label: 'sales.order.channelLabel', type: 'select' as const, choices: ['POS', 'ONLINE'].map((value) => ({ value, label: `sales.order.channel.${value}` })) }] : []),
            { key: 'status', label: 'sales.return.statusLabel', type: 'multi-select', choices: Object.keys(RETURN_STATUS).map((value) => ({ value, label: `sales.return.status.${value}` })) },
            { key: 'reason', label: 'sales.return.reasonLabel', type: 'multi-select', choices: ALL_REASONS.map((value) => ({ value, label: `sales.return.reason.${value}` })) },
        ],
    },
    table: {
        key: 'sales.return',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_RETURN_LIST },
        sort: { key: 'created_on', order: 'desc' },
        columns: [
            { key: 'return_no', label: 'sales.return.number', type: 'identifier', width: 16, sortable: true, locked: true, pin: 'start', copy: true },
            { key: 'customer_name', label: 'sales.order.customer', type: 'name', sub: 'customer_phone', width: 18 },
            ...(bothChannels ? [{ key: 'channel', label: 'sales.order.channelLabel', type: 'status' as const, width: 11, tones: ORDER_CHANNEL }] : []),
            { key: 'status', label: 'sales.return.statusLabel', type: 'status', width: 13, tones: RETURN_STATUS },
            { key: 'return_reason', label: 'sales.return.reasonLabel', type: 'status', width: 17, tones: RETURN_REASON },
            { key: 'units', label: 'sales.order.units', type: 'quantity', width: 8 },
            { key: 'value', label: 'sales.return.value', type: 'money', width: 12 },
            { key: 'refund_amount', label: 'sales.return.refund', type: 'money', width: 12 },
            { key: 'created_on', label: 'sales.return.raisedOn', type: 'date', format: 'date-time-12', width: 15, sortable: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [{ key: 'view', label: 'sales.order.view', icon: 'lucideEye', permission: 'sales.return.view', stateful: false, run: { kind: 'navigate', route: RETURN_ROUTES.detailPattern } }],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideUndo2', title: 'sales.return.emptyTitle', body: 'sales.return.emptyBody' },
    },
});
