import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { PURCHASE_ORDER_ROUTES } from '@app/modules/inventory/purchase-order/constants/purchase-order-routes';

/** In is success, out is progress or danger, anything that undoes an earlier movement is quiet. */
export const STOCK_MOVEMENT_REASON: ToneMap = {
    carried_over: { label: 'inventory.stockMovement.reason.carried_over', tone: 'neutral', icon: 'lucideArchive' },
    received: { label: 'inventory.stockMovement.reason.received', tone: 'success', icon: 'lucidePackageCheck' },
    sold: { label: 'inventory.stockMovement.reason.sold', tone: 'progress', icon: 'lucideReceipt' },
    dispatched: { label: 'inventory.stockMovement.reason.dispatched', tone: 'progress', icon: 'lucideTruck' },
    returned: { label: 'inventory.stockMovement.reason.returned', tone: 'warning', icon: 'lucideUndo2' },
    disposed: { label: 'inventory.stockMovement.reason.disposed', tone: 'danger', icon: 'lucideTrash2' },
    dispose_reversed: { label: 'inventory.stockMovement.reason.dispose_reversed', tone: 'neutral', icon: 'lucideUndo2' },
    adjusted: { label: 'inventory.stockMovement.reason.adjusted', tone: 'warning', icon: 'lucideSlidersHorizontal' },
    opening_stock: { label: 'inventory.stockMovement.reason.opening_stock', tone: 'success', icon: 'lucidePackagePlus' },
};

const REASONS = Object.keys(STOCK_MOVEMENT_REASON);

/** Every change to a batch's quantity, newest first. A movement is never opened or edited, so rows carry no actions. */
export const STOCK_MOVEMENT_LIST: ListShellPageConfig = {
    permission: 'inventory.stock-movement.view',
    header: { count: true },
    stats: [
        { key: 'units_in', label: 'inventory.stockMovement.stat.in', icon: 'lucidePackageCheck', tone: 'success' },
        { key: 'units_out', label: 'inventory.stockMovement.stat.out', icon: 'lucidePackage' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'inventory.stockMovement.searchPlaceholder' },
        fields: [{ key: 'reason', label: 'inventory.stockMovement.reason.label', type: 'multi-select', choices: REASONS.map((value) => ({ value, label: `inventory.stockMovement.reason.${value}` })) }],
    },
    table: {
        key: 'inventory.stock-movement',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_STOCK_MOVEMENT_LIST },
        sort: { key: 'created_on', order: 'desc' },
        columns: [
            { key: 'created_on', label: 'inventory.stockMovement.when', type: 'date', format: 'date-time-12', width: 15, sortable: true, locked: true, pin: 'start' },
            { key: 'product_name', label: 'inventory.stockMovement.product', type: 'name', sub: 'sku', width: 18, sortable: true, locked: true },
            { key: 'batch_code', label: 'inventory.stockMovement.batch', type: 'identifier', copy: true, width: 13 },
            { key: 'reason', label: 'inventory.stockMovement.reason.label', type: 'status', tones: STOCK_MOVEMENT_REASON, width: 14 },
            { key: 'quantity', label: 'inventory.stockMovement.quantity', type: 'number', signed: true, width: 8, sortable: true },
            { key: 'balance_after', label: 'inventory.stockMovement.balanceAfter', type: 'number', width: 8 },
            { key: 'reference', label: 'inventory.stockMovement.document', type: 'link', route: PURCHASE_ORDER_ROUTES.detailPattern.replace(':oid', ':purchase_oid'), width: 12 },
            { key: 'created_by', label: 'inventory.stockMovement.by', type: 'user', name: 'created_by_name', width: 12 },
            { key: 'warehouse_name', label: 'inventory.stockMovement.warehouse', type: 'text', width: 12, hidden: true },
        ],
        layouts: [{ type: 'table' }],
        empty: { icon: 'lucideInbox', title: 'inventory.stockMovement.emptyTitle', body: 'inventory.stockMovement.emptyBody' },
    },
};
