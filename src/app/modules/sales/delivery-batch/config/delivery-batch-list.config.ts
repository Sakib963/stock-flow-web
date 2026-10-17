import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { COURIERS } from '@app/core/models/order.model';
import { DELIVERY_BATCH_ROUTES } from '@app/modules/sales/delivery-batch/constants/delivery-batch-routes';

export const DELIVERY_BATCH_STATUS: ToneMap = {
    Open: { label: 'sales.deliveryBatch.status.Open', tone: 'warning', icon: 'lucidePackage' },
    HandedOver: { label: 'sales.deliveryBatch.status.HandedOver', tone: 'progress', icon: 'lucideTruck' },
    Delivered: { label: 'sales.deliveryBatch.status.Delivered', tone: 'success', icon: 'lucidePackageCheck' },
    PartlyDelivered: { label: 'sales.deliveryBatch.status.PartlyDelivered', tone: 'warning', icon: 'lucidePackageMinus' },
    NotDelivered: { label: 'sales.deliveryBatch.status.NotDelivered', tone: 'danger', icon: 'lucidePackageX' },
    Cancelled: { label: 'sales.deliveryBatch.status.Cancelled', tone: 'neutral', icon: 'lucideX' },
};

export const COURIER_TAG: ToneMap = Object.fromEntries(COURIERS.map((courier) => [courier, { label: `sales.order.couriers.${courier}`, tone: 'neutral' as const }]));

export const DELIVERY_BATCH_LIST: ListShellPageConfig = {
    permission: 'sales.delivery-batch.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'sales.deliveryBatch.add', icon: 'lucidePlus', permission: 'sales.delivery-batch.create', primary: true, run: { kind: 'navigate', route: DELIVERY_BATCH_ROUTES.create } }],
    },
    stats: [
        { key: 'open', label: 'sales.deliveryBatch.stat.open', icon: 'lucidePackage', tone: 'warning' },
        { key: 'handed_over', label: 'sales.deliveryBatch.stat.handedOver', icon: 'lucideTruck' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'sales.deliveryBatch.searchPlaceholder' },
        fields: [
            { key: 'status', label: 'sales.deliveryBatch.statusLabel', type: 'multi-select', choices: Object.keys(DELIVERY_BATCH_STATUS).map((value) => ({ value, label: `sales.deliveryBatch.status.${value}` })) },
            { key: 'courier', label: 'sales.order.courier', type: 'multi-select', choices: COURIERS.map((value) => ({ value, label: `sales.order.couriers.${value}` })) },
        ],
    },
    table: {
        key: 'sales.delivery-batch',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_DELIVERY_BATCH_LIST },
        sort: { key: 'created_on', order: 'desc' },
        columns: [
            { key: 'batch_no', label: 'sales.deliveryBatch.number', type: 'identifier', width: 16, sortable: true, locked: true, pin: 'start', copy: true },
            { key: 'courier', label: 'sales.order.courier', type: 'status', width: 12, tones: COURIER_TAG },
            { key: 'status', label: 'sales.deliveryBatch.statusLabel', type: 'status', width: 19, tones: DELIVERY_BATCH_STATUS },
            { key: 'orders', label: 'sales.deliveryBatch.orders', type: 'quantity', width: 9 },
            { key: 'delivered', label: 'sales.deliveryBatch.delivered', type: 'quantity', width: 10 },
            { key: 'to_collect', label: 'sales.deliveryBatch.toCollect', type: 'money', width: 14 },
            { key: 'created_on', label: 'sales.deliveryBatch.madeOn', type: 'date', format: 'date-time-12', width: 18, sortable: true },
            { key: 'handed_over_on', label: 'sales.deliveryBatch.handedOverOn', type: 'date', format: 'date-time-12', width: 18, sortable: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [{ key: 'view', label: 'sales.order.view', icon: 'lucideEye', permission: 'sales.delivery-batch.view', stateful: false, run: { kind: 'navigate', route: DELIVERY_BATCH_ROUTES.detailPattern } }],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideTruck', title: 'sales.deliveryBatch.emptyTitle', body: 'sales.deliveryBatch.emptyBody' },
    },
};
