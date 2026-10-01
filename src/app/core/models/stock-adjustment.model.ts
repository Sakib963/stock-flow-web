import { Budgets } from '@app/core/models/purchase-order.model';

export const ADJUSTMENT_REASONS = ['opening_stock', 'found', 'lost', 'theft', 'entry_error'] as const;
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];
export type AdjustmentStatus = 'Draft' | 'Submitted' | 'Verified' | 'Rejected' | 'Cancelled';
export type AdjustmentDirection = 'in' | 'out';
export type IntendedUse = 'for_sale' | 'internal_use';

/** Which way each reason moves stock; Entry error is chosen per line. */
export const REASON_DIRECTION: Record<AdjustmentReason, AdjustmentDirection | null> = { opening_stock: 'in', found: 'in', lost: 'out', theft: 'out', entry_error: null };

/** One row of the list. Values are left out by the server for someone who may not see money. */
export interface StockAdjustmentRow {
    oid: string;
    adjustment_number: string;
    reason: AdjustmentReason;
    status: AdjustmentStatus;
    note: string | null;
    created_on: string;
    created_by: string;
    created_by_name: string | null;
    line_count: number;
    units_in: number;
    units_out: number;
    value_in?: number;
    value_out?: number;
}

export interface StockAdjustmentDetails extends StockAdjustmentRow {
    reject_reason: string | null;
    cancel_reason: string | null;
    submitted_on: string | null;
    submitted_by: string | null;
    submitted_by_name: string | null;
    verified_on: string | null;
    verified_by: string | null;
    verified_by_name: string | null;
    rejected_on: string | null;
    rejected_by: string | null;
    rejected_by_name: string | null;
    cancelled_on: string | null;
    cancelled_by: string | null;
    cancelled_by_name: string | null;
}

/** A line as stored. Prices arrive as text (Postgres numeric), so they are read through Number(). Budgets are a new batch's, absent for someone who may not see money. */
export interface StockAdjustmentLine extends Partial<Record<keyof Budgets, string | number | null>> {
    cost_remarks?: string | null;
    oid: string;
    product_oid: string;
    product_name: string;
    sku: string | null;
    has_expiry: boolean;
    unit_type: string | null;
    direction: AdjustmentDirection | null;
    quantity: number | null;
    inventory_oid: string | null;
    batch_code: string | null;
    on_hand: number | null;
    free: number | null;
    cost_price?: string | number | null;
    value?: string | number | null;
    intended_use: IntendedUse | null;
    selling_price: string | number | null;
    maximum_discount: string | number | null;
    warehouse_oid: string | null;
    warehouse_name: string | null;
    aisle_oid: string | null;
    aisle_name: string | null;
    expiry_date: string | null;
}

export interface StockAdjustmentActivity {
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

export interface StockAdjustmentRecord {
    details: StockAdjustmentDetails;
    lines: StockAdjustmentLine[];
    activity: StockAdjustmentActivity[];
    sees_money: boolean;
}

/** A batch a line can move, with what is free of holds: a decrease may take only that. */
export interface AdjustableBatch {
    oid: string;
    batch_code: string;
    intended_use: IntendedUse;
    on_hand: number;
    free: number;
    cost_price?: string | number | null;
    budget_per_unit?: string | number | null;
    selling_price: string | number | null;
    maximum_discount: string | number | null;
    warehouse_name: string | null;
    expiry_date: string | null;
}

export interface AdjustableProduct {
    oid: string;
    name: string;
    sku: string | null;
    has_expiry: boolean;
    unit_type: string | null;
    photo_thumb: string | null;
    batches: AdjustableBatch[];
}

/** Budgets are per unit and belong only to a line that creates a batch. */
export interface AdjustmentLinePayload extends Budgets {
    cost_remarks: string | null;
    product_oid: string;
    direction: AdjustmentDirection | null;
    quantity: number | null;
    inventory_oid: string | null;
    cost_price: number | null;
    intended_use: IntendedUse | null;
    selling_price: number | null;
    maximum_discount: number | null;
    warehouse_oid: string | null;
    aisle_oid: string | null;
    expiry_date: string | null;
}

export interface StockAdjustmentPayload {
    oid?: string;
    draft: boolean;
    reason: AdjustmentReason;
    note: string | null;
    lines: AdjustmentLinePayload[];
}

/** A line as the form holds it: what is sent, plus the product and batch it names, to draw it. */
export interface AdjustmentLineDraft extends AdjustmentLinePayload {
    product: AdjustableProduct;
    batch: AdjustableBatch | null;
}
