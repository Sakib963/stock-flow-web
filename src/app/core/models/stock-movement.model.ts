/** The kind of document behind a movement, which decides the page its number opens. */
export type StockMovementDocument = 'purchase-order' | 'order' | 'return' | 'disposal' | 'adjustment' | 'giveaway';

export type StockMovementReason = 'carried_over' | 'received' | 'sold' | 'dispatched' | 'returned' | 'disposed' | 'dispose_reversed' | 'given_away' | 'adjusted' | 'opening_stock';

/** One change to a batch's quantity: positive in, negative out, and what the batch held after it. */
export interface StockMovementRow {
    oid: string;
    created_on: string;
    reason: StockMovementReason;
    quantity: number;
    balance_after: number;
    product_oid: string;
    product_name: string;
    sku: string | null;
    batch_code: string;
    warehouse_name: string | null;
    /** The purchase order, invoice, return, disposal, adjustment or giveaway number; null for a carried over balance. */
    reference: string | null;
    reference_kind: StockMovementDocument | null;
    reference_oid: string | null;
    created_by: string;
    created_by_name: string | null;
}
