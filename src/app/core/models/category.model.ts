/** A category as the list, the form and the detail page see it. */
export interface Category {
    oid: string;
    name: string;
    category_code: string;
    description: string | null;
    status: CategoryStatus;
    created_on?: string;
    last_action_by?: string | null;
    last_action_on?: string | null;
}

export type CategoryStatus = 'Active' | 'Inactive';

/** What the form sends. `oid` is absent when the category is being created. */
export interface CategoryPayload {
    oid?: string;
    name: string;
    category_code: string;
    description: string | null;
    status: CategoryStatus;
}

/** The numbers the detail page shows above the record, computed by the server. */
export interface CategoryStats {
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

export interface CategoryActivity {
    date: string;
    user: string;
    action: string;
    description: string | null;
}

export interface CategoryDetails {
    details: Category;
    stats: CategoryStats;
    activity: CategoryActivity[];
}

/** Which field a 409 was about, so the form marks the input the person has to change. */
export type CategoryField = 'name' | 'category_code';

/** A duplicate the server refused, naming the field the form has to mark. */
export interface CategoryConflict {
    field: CategoryField;
    message: string;
}
