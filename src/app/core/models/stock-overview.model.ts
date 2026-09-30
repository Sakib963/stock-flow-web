import { ProductActivity, ProductStatus, ProductUnit } from '@app/core/models/product.model';
import { BudgetKey, IntendedUse } from '@app/core/models/purchase-order.model';

/**
 * The money a caller may not see is absent, not zero: the server leaves it out for someone without
 * inventory.stock-value.view, so every money field is optional here.
 */
export interface StockMoney {
    stock_value?: number;
    internal_value?: number;
    expiring_value?: number;
    expected_revenue?: number;
    profit_full?: number;
    profit_discounted?: number;
}

export interface StockFigures extends StockMoney {
    on_hand: number;
    held: number;
    sellable: number;
    batches: number;
    unpriced_batches: number;
    expired_units: number;
    expiring_units: number;
}

export interface StockProduct {
    oid: string;
    name: string;
    sku: string | null;
    photo: string | null;
    status: ProductStatus;
    unit_type: ProductUnit | null;
    restock_threshold: number;
    has_expiry: boolean;
    category_name: string | null;
    sub_category_name: string | null;
    brand_name: string | null;
}

export type BatchStatus = 'ready_for_sale' | 'pending_pricing' | 'internal_use';

export interface StockBatch {
    oid: string;
    batch_code: string;
    intended_use: IntendedUse;
    status: BatchStatus;
    received_on: string;
    expiry_date: string | null;
    initial_quantity: number;
    on_hand: number;
    held: number;
    sellable: number;
    selling_price: number | null;
    maximum_discount: number | null;
    priced: boolean;
    warehouse_name: string | null;
    aisle_name: string | null;
    purchase_oid: string | null;
    po_number: string | null;
    supplier_name: string | null;
    cost_price?: number;
    ad_run_cost?: number | null;
    packaging_cost?: number | null;
    gift_cost?: number | null;
    content_creation_cost?: number | null;
    influencer_cost?: number | null;
    cost_remarks?: string | null;
    budget_per_unit?: number;
    margin_per_unit?: number | null;
    stock_value?: number;
    /** Priced batches only: what its units would bring in and leave, before any sale. */
    expected_revenue?: number | null;
    profit_full?: number | null;
}

export interface ProductStock {
    product: StockProduct;
    figures: StockFigures;
    batches: StockBatch[];
    activity: ProductActivity[];
    sees_money: boolean;
    business_name: string | null;
}

export interface BatchBudgetPayload extends Record<BudgetKey, number | null> {
    inventory_oid: string;
    cost_remarks: string | null;
}

/** What one sticker says. The price is absent for a batch that has none. */
export interface StickerContent {
    business: string;
    product: string;
    code: string;
    price: number | null;
    expiry: string | null;
}

