import { AdjustableBatch, AdjustableProduct, AdjustmentDirection, AdjustmentLinePayload, AdjustmentReason, REASON_DIRECTION } from '@app/core/models/stock-adjustment.model';

/** Which way a line goes: the reason's own direction, or the line's for an entry error. */
export const directionOf = (reason: AdjustmentReason | null, line: Pick<AdjustmentLinePayload, 'direction'>): AdjustmentDirection | null => (reason ? (REASON_DIRECTION[reason] ?? line.direction) : null);

/** A line going down, or one that picked a batch, moves an existing batch; the rest create one. */
export const isNewBatch = (reason: AdjustmentReason | null, line: Pick<AdjustmentLinePayload, 'direction' | 'inventory_oid'>): boolean => directionOf(reason, line) !== 'out' && !line.inventory_oid;

/** Batches a line may pick: going down, only those with something free; Opening stock never picks one. */
export const batchesFor = (reason: AdjustmentReason | null, direction: AdjustmentDirection | null, product: AdjustableProduct | null): AdjustableBatch[] => {
    if (!product || reason === 'opening_stock') return [];
    return direction === 'out' ? product.batches.filter((batch) => batch.free > 0) : product.batches;
};

/** The first thing a line still needs under its reason, as a copy key, or null when it is complete. */
export const lineProblem = (reason: AdjustmentReason | null, line: AdjustmentLinePayload & { batch?: AdjustableBatch | null }): string | null => {
    if (!line.product_oid) return 'inventory.stockAdjustment.problem.product';
    const direction = directionOf(reason, line);
    if (!direction) return 'inventory.stockAdjustment.problem.direction';
    if (!line.quantity || line.quantity < 1) return 'inventory.stockAdjustment.problem.quantity';
    if (direction === 'out') {
        if (!line.inventory_oid) return 'inventory.stockAdjustment.problem.batch';
        return line.batch && line.quantity > line.batch.free ? 'inventory.stockAdjustment.problem.moreThanFree' : null;
    }
    if (reason === 'opening_stock' && line.inventory_oid) return 'inventory.stockAdjustment.problem.openingNewBatch';
    if (!isNewBatch(reason, line)) return null;
    if (line.cost_price === null) return 'inventory.stockAdjustment.problem.cost';
    if (!line.warehouse_oid) return 'inventory.stockAdjustment.problem.warehouse';
    if (line.intended_use === 'for_sale' && !(Number(line.selling_price) >= 1)) return 'inventory.stockAdjustment.problem.price';
    if (line.intended_use === 'for_sale' && Number(line.maximum_discount ?? 0) > Number(line.selling_price)) return 'inventory.stockAdjustment.problem.discount';
    return null;
};
