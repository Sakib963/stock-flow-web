export type PurchaseOrderStatus = 'Submitted' | 'Verified' | 'Cancelled';
export type PaymentStatus = 'paid' | 'partially_paid' | 'unpaid';
export type PurchaseType = 'instant' | 'advance' | 'overseas';
export type IntendedUse = 'for_sale' | 'internal_use';

export const PURCHASE_TYPES: readonly PurchaseType[] = ['instant', 'advance', 'overseas'];
export const PAYMENT_STATUSES: readonly PaymentStatus[] = ['paid', 'partially_paid', 'unpaid'];

/** The five per-unit budgets a batch can carry, each multiplied by the units received. */
export const BUDGET_KEYS = ['ad_run_cost', 'packaging_cost', 'gift_cost', 'content_creation_cost', 'influencer_cost'] as const;
export type BudgetKey = (typeof BUDGET_KEYS)[number];
export type Budgets = Record<BudgetKey, number | null>;

/** A row of the list. Money arrives as numeric strings from bigint columns. */
export interface PurchaseOrderRow {
    oid: string;
    po_number: string;
    supplier_oid: string;
    supplier_name: string;
    purchase_type: PurchaseType;
    status: PurchaseOrderStatus;
    payment_status: PaymentStatus;
    total_amount: string;
    /** Follows payment_status, never the stored figure alone. */
    paid_amount: string;
    expected_delivery_date: string | null;
    product_count: number;
    created_on: string;
}

export interface PurchaseOrderHeader {
    oid: string;
    po_number: string;
    status: PurchaseOrderStatus;
    purchase_type: PurchaseType;
    special_notes: string | null;
    cancel_reason: string | null;
    payment_status: PaymentStatus;
    total_amount: string;
    paid_amount: string;
    expected_delivery_date: string | null;
    supplier_oid: string;
    supplier_name: string;
    supplier_phone: string;
    supplier_status: string;
    supplier_orders_this_year: number;
    created_on: string;
    created_by: string;
    created_by_name: string | null;
    verified_on: string | null;
    verified_by: string | null;
    verified_by_name: string | null;
    cancelled_on: string | null;
    cancelled_by: string | null;
    cancelled_by_name: string | null;
}

export interface PurchaseBatch {
    oid: string;
    batch_code: string;
    intended_use: IntendedUse;
    status: string;
    initial_quantity: number;
    quantity_available: number;
    selling_price: string | null;
    maximum_discount: string | null;
}

export interface PurchaseOrderLine extends Budgets {
    oid: string;
    product_oid: string;
    product_name: string;
    sku: string | null;
    restock_threshold: number;
    photo_thumb: string | null;
    warehouse_oid: string;
    warehouse_name: string;
    aisle_oid: string | null;
    aisle_name: string | null;
    ordered_quantity: number;
    ordered_unit_price: string;
    received_quantity: number | null;
    received_unit_price: string | null;
    sellable: number;
    current_selling_price: string | null;
    current_maximum_discount: string | null;
    cost_remarks: string | null;
    batches: PurchaseBatch[];
}

export interface PurchaseOrderStats {
    ordered_total: number;
    ordered_units: number;
    received_total: number | null;
    received_units: number | null;
    lines_short: number | null;
    units_short: number | null;
    price_changed: number | null;
    batches: number;
    budgets_total: number | null;
    warehouses: number;
}

export interface PurchaseOrderActivity {
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

export interface PurchaseOrderDetails {
    details: PurchaseOrderHeader;
    lines: PurchaseOrderLine[];
    stats: PurchaseOrderStats;
    activity: PurchaseOrderActivity[];
}

export interface PurchaseOrderLinePayload {
    product_oid: string;
    warehouse_oid: string;
    aisle_oid: string | null;
    quantity: number;
    unit_price: number;
}

export interface PurchaseOrderPayload {
    oid?: string;
    supplier_oid: string;
    purchase_type: PurchaseType;
    expected_delivery_date: string | null;
    special_notes: string | null;
    /** Sent on create only. An edit never carries payment: it changes through Record payment alone. */
    payment_status?: PaymentStatus;
    paid_amount?: number;
    products: PurchaseOrderLinePayload[];
}

export interface PaymentPayload {
    oid: string;
    payment_status: PaymentStatus;
    paid_amount: number;
}

/** One line as counted at delivery. Selling price and discount only for stock that is for sale. */
export interface VerifyLinePayload extends Budgets {
    oid: string;
    received_quantity: number;
    unit_price: number;
    intended_use: IntendedUse;
    selling_price?: number;
    maximum_discount?: number;
    cost_remarks: string | null;
}

export interface VerifyResult {
    po_number: string;
    units: number;
    batches: number;
}

/** A product as the order line's search offers it. */
export interface PurchasableProduct {
    oid: string;
    name: string;
    sku: string | null;
    restock_threshold: number;
    photo_thumb: string | null;
    sellable: number;
    sold_30_days: number;
    last_unit_price: string | null;
    last_supplier_name: string | null;
    last_bought_on: string | null;
}

export interface SupplierChoice {
    value: string;
    label: string;
    phone_number: string;
}

export interface WarehouseChoice {
    value: string;
    label: string;
}

export interface AisleChoice {
    value: string;
    label: string;
    warehouse_oid: string;
}

export type PurchaseOrderReport = 'summary' | 'products';
