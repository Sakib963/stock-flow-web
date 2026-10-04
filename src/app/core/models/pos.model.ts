/** A batch the counter can sell, as the product search returns it. Availability is sellable: on hand less online holds. */
export interface PosBatch {
    product_oid: string;
    product_name: string;
    image_url: string | null;
    sku: string | null;
    inventory_oid: string;
    batch_code: string;
    expiry_date: string | null;
    quantity_available: number;
    sellable_quantity: number;
    selling_price: number;
    maximum_discount: number;
}

/** A line in the cart. Price and the discount ceiling are the batch's; the server prices the sale from them again. */
export interface CartLine {
    inventory_oid: string;
    product_oid: string;
    product_name: string;
    batch_code: string;
    expiry_date: string | null;
    selling_price: number;
    maximum_discount: number;
    sellable: number;
    quantity: number;
    /** Per unit, never per line. */
    discount: number;
}

export interface ParkedCart {
    oid: string;
    invoice_no: string;
    draft_label: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    total_amount: number;
    created_on: string;
    parked_by: string | null;
    lines: CartLine[];
}

export const PAYMENT_METHODS = ['cash', 'bkash', 'nagad', 'card', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['paid', 'partially_paid', 'unpaid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

interface CartLinePayload {
    inventory_oid: string;
    quantity: number;
    discount: number;
}

export interface CheckoutPayload {
    oid: string;
    customer?: { phone: string; name: string | null };
    payment_method: PaymentMethod;
    payment_reference: string | null;
    payment_status: PaymentStatus;
    amount_paid?: number;
    total_amount: number;
    lines: CartLinePayload[];
}

export interface ParkPayload {
    oid: string;
    draft_label: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    lines: CartLinePayload[];
}

export interface SaleResult {
    oid: string;
    invoice_no: string;
    total_amount: number;
    amount_paid: number;
}

/** What the counter shows about a phone: who it is and how often they have bought, or nobody yet. */
export interface CustomerLookup {
    phone: string;
    customer: { oid: string; name: string; flag: 'None' | 'Watch' | 'Blocked' } | null;
    history?: { sales: number; last_order_on: string | null };
}
