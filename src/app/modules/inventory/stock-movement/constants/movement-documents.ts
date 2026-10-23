import { StockMovementDocument, StockMovementRow } from '@app/core/models/stock-movement.model';
import { DISPOSAL_ROUTES } from '@app/modules/inventory/disposal/constants/disposal-routes';
import { PURCHASE_ORDER_ROUTES } from '@app/modules/inventory/purchase-order/constants/purchase-order-routes';
import { STOCK_ADJUSTMENT_ROUTES } from '@app/modules/inventory/stock-adjustment/constants/stock-adjustment-routes';
import { GIVEAWAY_ROUTES } from '@app/modules/sales/giveaway/constants/giveaway-routes';
import { ORDER_ROUTES } from '@app/modules/sales/order/constants/order-routes';
import { RETURN_ROUTES } from '@app/modules/sales/return/constants/return-routes';

/** The record page each document behind a movement opens, filled from the row's reference_oid, and the permission that opens it. */
export const MOVEMENT_DOCUMENTS: Readonly<Record<StockMovementDocument, { route: string; permission: string }>> = {
    'purchase-order': { route: PURCHASE_ORDER_ROUTES.detailPattern.replace(':oid', ':reference_oid'), permission: 'inventory.purchase-order.view' },
    order: { route: ORDER_ROUTES.detailPattern.replace(':oid', ':reference_oid'), permission: 'sales.order.view' },
    return: { route: RETURN_ROUTES.detailPattern.replace(':oid', ':reference_oid'), permission: 'sales.return.view' },
    disposal: { route: DISPOSAL_ROUTES.detailPattern.replace(':oid', ':reference_oid'), permission: 'inventory.product-dispose.view' },
    adjustment: { route: STOCK_ADJUSTMENT_ROUTES.detailPattern.replace(':oid', ':reference_oid'), permission: 'inventory.stock-adjustment.view' },
    giveaway: { route: GIVEAWAY_ROUTES.detailPattern.replace(':oid', ':reference_oid'), permission: 'sales.giveaway.view' },
};

/** The page a movement's document number opens, or null when it has none or the person may not open it. */
export const documentRoute = (move: Pick<StockMovementRow, 'reference_kind' | 'reference_oid'>, can: (permission: string) => boolean): string | null => {
    const document = move.reference_kind ? MOVEMENT_DOCUMENTS[move.reference_kind] : null;
    return document && move.reference_oid && can(document.permission) ? document.route.replace(':reference_oid', encodeURIComponent(move.reference_oid)) : null;
};
