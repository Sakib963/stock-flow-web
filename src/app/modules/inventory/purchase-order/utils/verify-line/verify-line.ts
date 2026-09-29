import { BUDGET_KEYS, PurchaseOrderLine, VerifyLinePayload } from '@app/core/models/purchase-order.model';

/** What a unit leaves after the price billed and the budgets set against it. */
export const marginPerUnit = (sellingPrice: number, unitPrice: number, budgetPerUnit: number): number => sellingPrice - unitPrice - budgetPerUnit;

export const budgetPerUnit = (value: Pick<VerifyLinePayload, (typeof BUDGET_KEYS)[number]>): number => BUDGET_KEYS.reduce((sum, key) => sum + Number(value[key] ?? 0), 0);

/**
 * Everything arrived as ordered, at the price ordered, for sale at the price the product already
 * sells at. Null when the product has no selling price yet: that line needs someone to set one.
 */
export const allArrived = (line: PurchaseOrderLine): VerifyLinePayload | null => {
    if (line.current_selling_price === null) return null;
    return {
        oid: line.oid,
        received_quantity: line.ordered_quantity,
        unit_price: Number(line.ordered_unit_price),
        intended_use: 'for_sale',
        selling_price: Number(line.current_selling_price),
        maximum_discount: Number(line.current_maximum_discount ?? 0),
        ad_run_cost: null,
        packaging_cost: null,
        gift_cost: null,
        content_creation_cost: null,
        influencer_cost: null,
        cost_remarks: null,
    };
};

/** The rules the server holds for a line, so Verify is not offered for a count it would refuse. */
export const lineReady = (value: VerifyLinePayload | undefined, line: PurchaseOrderLine): boolean => {
    if (!value) return false;
    if (value.received_quantity < 0 || value.received_quantity > line.ordered_quantity || value.unit_price < 0) return false;
    if (value.intended_use === 'internal_use') return true;
    return (value.selling_price ?? 0) >= 1 && value.maximum_discount !== undefined && value.maximum_discount >= 0 && value.maximum_discount <= (value.selling_price ?? 0);
};
