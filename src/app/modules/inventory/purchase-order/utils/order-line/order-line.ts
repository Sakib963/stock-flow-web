import { PurchaseLineDraft } from '@app/core/models/purchase-order.model';

/** A line Submit accepts: a product, where it goes, at least one unit and a price, even a price of 0. */
export const lineComplete = (line: Pick<PurchaseLineDraft, 'product' | 'warehouse_oid' | 'quantity' | 'unit_price'>): boolean =>
    !!line.product && !!line.warehouse_oid && !!line.quantity && line.quantity >= 1 && line.quantity <= 9999 && line.unit_price !== null && line.unit_price >= 0 && line.unit_price <= 99999999;

export const lineTotal = (line: Pick<PurchaseLineDraft, 'quantity' | 'unit_price'>): number | null => (line.quantity && line.unit_price !== null ? line.quantity * line.unit_price : null);
