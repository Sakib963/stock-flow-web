import { AdjustableBatch, AdjustableProduct } from '@app/core/models/stock-adjustment.model';

/** The picker answers the same products and batches as the stock adjustment's. */
export type DisposableBatch = AdjustableBatch;
export type DisposableProduct = AdjustableProduct;

export const DISPOSAL_REASONS = ['damaged', 'expired', 'spoiled', 'sample', 'quality_reject', 'other'] as const;
export type DisposalReason = (typeof DISPOSAL_REASONS)[number];
export const DISPOSAL_METHODS = ['discarded', 'destroyed', 'donated', 'recycled', 'other'] as const;
export type DisposalMethod = (typeof DISPOSAL_METHODS)[number];
export type DisposalStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Cancelled';

/** One row of the list. Value is left out by the server for someone who may not see money. */
export interface DisposalRow {
    oid: string;
    dispose_no: string;
    disposal_date: string;
    method: DisposalMethod | null;
    status: DisposalStatus;
    note: string | null;
    created_on: string;
    created_by: string;
    created_by_name: string | null;
    line_count: number;
    units: number;
    value?: number;
}

export interface DisposalDetails extends DisposalRow {
    reject_reason: string | null;
    cancel_reason: string | null;
    submitted_on: string | null;
    submitted_by: string | null;
    submitted_by_name: string | null;
    approved_on: string | null;
    approved_by: string | null;
    approved_by_name: string | null;
    rejected_on: string | null;
    rejected_by: string | null;
    rejected_by_name: string | null;
    cancelled_on: string | null;
    cancelled_by: string | null;
    cancelled_by_name: string | null;
}

/** A line as stored. Cost and value arrive as text (Postgres numeric) and only for someone who may see money. */
export interface DisposalLine {
    oid: string;
    product_oid: string;
    product_name: string;
    sku: string | null;
    unit_type: string | null;
    inventory_oid: string | null;
    batch_code: string | null;
    quantity: number | null;
    reason: DisposalReason | null;
    line_note: string | null;
    on_hand: number | null;
    free: number | null;
    expiry_date: string | null;
    warehouse_name: string | null;
    cost_price?: string | number | null;
    value?: string | number | null;
}

export interface DisposalActivity {
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

export interface DisposalRecord {
    details: DisposalDetails;
    lines: DisposalLine[];
    activity: DisposalActivity[];
    sees_money: boolean;
}

export interface DisposalLinePayload {
    product_oid: string;
    inventory_oid: string | null;
    quantity: number | null;
    reason: DisposalReason | null;
    line_note: string | null;
}

export interface DisposalPayload {
    oid?: string;
    draft: boolean;
    method: DisposalMethod | null;
    note: string | null;
    lines: DisposalLinePayload[];
}

/** A line as the form holds it: what is sent, plus the product and batch it names, to draw it. */
export interface DisposalLineDraft extends DisposalLinePayload {
    product: DisposableProduct;
    batch: DisposableBatch | null;
}
