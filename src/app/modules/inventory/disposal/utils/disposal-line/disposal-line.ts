import { DisposableBatch, DisposableProduct, DisposalLinePayload } from '@app/core/models/disposal.model';

/** Only batches with something free of holds can be disposed: units promised to an order must still ship. */
export const batchesFor = (product: DisposableProduct | null): DisposableBatch[] => (product ? product.batches.filter((batch) => batch.free > 0) : []);

/** The first thing a line still needs, as a copy key, or null when it is complete. */
export const lineProblem = (line: DisposalLinePayload & { batch?: DisposableBatch | null }): string | null => {
    if (!line.product_oid) return 'inventory.disposal.problem.product';
    if (!line.inventory_oid) return 'inventory.disposal.problem.batch';
    if (!line.quantity || line.quantity < 1) return 'inventory.disposal.problem.quantity';
    if (line.batch && line.quantity > line.batch.free) return 'inventory.disposal.problem.moreThanFree';
    if (!line.reason) return 'inventory.disposal.problem.reason';
    if (line.reason === 'other' && !line.line_note?.trim()) return 'inventory.disposal.problem.note';
    return null;
};
