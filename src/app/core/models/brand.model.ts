/** A brand as the list, the form and the detail page see it. */
export interface Brand {
    oid: string;
    name: string;
    description: string | null;
    /** ISO 3166-1 alpha-2, such as KR. Optional. */
    origin_country: string | null;
    status: BrandStatus;
    created_by?: string | null;
    created_on?: string;
    last_action_by?: string | null;
    last_action_on?: string | null;
}

export type BrandStatus = 'Active' | 'Inactive';

/** What the form sends. `oid` is absent when the brand is being created. */
export interface BrandPayload {
    oid?: string;
    name: string;
    description: string | null;
    origin_country: string | null;
    status: BrandStatus;
}

/** The numbers the detail page shows above the record, computed by the server. */
export interface BrandStats {
    totalProducts: number;
    activeProducts: number;
    /**
     * What was spent on the stock that is there, from `cost_price`.
     *
     * Not what it might sell for. Plenty of what a business holds is never sold: packaging,
     * delivery materials, office supplies. Those batches carry no selling price at all, so a sale
     * value would either skip them or invent one.
     */
    amountSpent: number;
    totalAvailableQuantity: number;
    lowStockItems: number;
    outOfStockItems: number;
    averageProductPrice: number;
}

export interface BrandActivity {
    /** The activity log row's own id, so two entries in the same millisecond do not collide. */
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

/** The reports a brand offers. Each one is a download, gated by `configuration.brands.export`. */
export type BrandReport = 'products' | 'inventory';

export interface BrandDetails {
    details: Brand;
    stats: BrandStats;
    activity: BrandActivity[];
}

/** Which field a 409 was about, so the form marks the input the person has to change. */
export type BrandField = 'name';

/** Every control on the brand form, so the aria helpers cannot be asked about a field that is not there. */
export type BrandFormField = 'name' | 'origin_country' | 'description' | 'status';

