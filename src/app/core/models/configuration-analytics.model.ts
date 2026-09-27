/**
 * The configuration analytics page. Every section is optional because the server leaves out any
 * feature the person cannot open.
 */
export interface ConfigurationAnalytics {
    counts: Partial<Record<AnalyticsFeature, { active: number; added: number }>>;
    attention: AttentionCheck[];
    spread: Partial<Record<SpreadGroup, Spread>>;
    warehouses: WarehouseFullness[] | null;
    activity: ConfigurationChange[];
}

export type AnalyticsFeature = 'product' | 'category' | 'subCategory' | 'brand' | 'supplier' | 'warehouse' | 'aisle';

export type AttentionKey = 'productsWithoutPhoto' | 'productsWithoutBrand' | 'productsWithoutThreshold' | 'emptyCategories' | 'emptySubCategories' | 'emptyBrands' | 'emptyAisles' | 'suppliersNeverBoughtFrom' | 'inactiveCategoriesInUse' | 'inactiveBrandsInUse';

/** `items` is the first few by name; `total` is all of them. */
export interface AttentionCheck {
    key: AttentionKey;
    total: number;
    items: { oid: string; name: string; detail: string | null }[];
}

export type SpreadGroup = 'category' | 'brand' | 'supplier';

/**
 * Active products per group, biggest first. `other` is the groups past those shown, and null for
 * suppliers, whose shares overlap because a product can be bought from several.
 */
export interface Spread {
    total: number;
    rows: { oid: string | null; name: string | null; products: number }[];
    other: { groups: number; products: number } | null;
}

export interface WarehouseFullness {
    oid: string;
    name: string;
    onHand: number;
    capacity: number | null;
    fullRate: number | null;
}

export interface ConfigurationChange {
    oid: string;
    type: string;
    recordOid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}
