/** A product as the list, the form and the detail page see it. */
export interface Product {
    oid: string;
    name: string;
    /** The code a scanner reads. The server makes one when the form sends none. */
    sku: string | null;
    /** A Cloudinary URL from our own account, or none. */
    photo: string | null;
    unit_type: ProductUnit | null;
    description: string | null;
    restock_threshold: number;
    status: ProductStatus;
    /** Whether its batches carry an expiry date. */
    has_expiry: boolean;
    category_oid: string;
    category_name?: string | null;
    sub_category_oid: string;
    sub_category_name?: string | null;
    brand_oid: string | null;
    brand_name?: string | null;
    created_by?: string | null;
    created_on?: string;
    last_action_by?: string | null;
    last_action_on?: string | null;
}

export type ProductStatus = 'Active' | 'Inactive';

export type ProductUnit = 'pcs' | 'pair' | 'set' | 'dozen' | 'box' | 'pack' | 'kg' | 'g' | 'l' | 'm';

/** What the form sends. `oid` is absent when the product is being created; a null `sku` asks the server to make one. */
export interface ProductPayload {
    oid?: string;
    name: string;
    sku: string | null;
    sub_category_oid: string;
    brand_oid: string | null;
    unit_type: ProductUnit | null;
    restock_threshold: number;
    description: string | null;
    photo: string | null;
    status: ProductStatus;
    has_expiry: boolean;
}

/** One batch still holding or promising stock. `sellable` is on hand less what online orders hold. */
export interface ProductBatch {
    oid: string;
    batch_code: string;
    warehouse_name: string | null;
    received_on: string;
    on_hand: number;
    held: number;
    sellable: number;
    cost_price: number;
    selling_price: number | null;
    /** A plain day, `2027-03-31`, or none. */
    expiry_date: string | null;
}

/** Where a batch stands against its expiry date. */
export type ExpiryState = 'none' | 'expired' | 'soon' | 'fresh';

export interface ProductStock {
    on_hand: number;
    held: number;
    sellable: number;
    batches: ProductBatch[];
}

/** Counted since the product was added. A sale is an order whose stock has actually left. */
export interface ProductLifetime {
    sold: number;
    returned: number;
    damaged: number;
    last_sold_on: string | null;
}

export interface ProductActivity {
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

export interface ProductDetails {
    details: Product;
    stock: ProductStock;
    lifetime: ProductLifetime;
    activity: ProductActivity[];
}

/** What the server hands back so the browser can upload one photo straight to Cloudinary. */
export interface PhotoUploadSignature {
    cloud_name: string;
    api_key: string;
    folder: string;
    timestamp: number;
    signature: string;
}

/** One option in the product form's sub-category picker, grouped under its category. */
export interface SubCategoryChoice {
    value: string;
    label: string;
    groupLabel: string;
}

/** Where an upload stands: `progress` runs 0 to 100 while the file travels. */
export type PhotoUpload = { state: 'uploading'; progress: number } | { state: 'done'; url: string };

/** Which field a 409 or 400 was about, so the form marks the input the person has to change. */
export type ProductField = 'sku' | 'sub_category_oid' | 'brand_oid';

export type ProductFormField = 'name' | 'sku' | 'sub_category_oid' | 'brand_oid' | 'unit_type' | 'restock_threshold' | 'description' | 'status' | 'has_expiry';
