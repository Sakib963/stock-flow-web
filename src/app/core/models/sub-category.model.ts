import { CategoryActivity, CategoryStats } from '@app/core/models/category.model';

/** A sub-category as the list, the form and the detail page see it. `category_code` is the sub-category's own code: the column has always had that name. */
export interface SubCategory {
    oid: string;
    name: string;
    category_code: string;
    category_oid: string;
    category_name?: string;
    description: string | null;
    status: SubCategoryStatus;
    created_by?: string | null;
    created_on?: string;
    last_action_by?: string | null;
    last_action_on?: string | null;
}

export type SubCategoryStatus = 'Active' | 'Inactive';

export interface SubCategoryPayload {
    oid?: string;
    name: string;
    category_code: string;
    category_oid: string;
    description: string | null;
    status: SubCategoryStatus;
}

export interface SubCategoryDetails {
    details: SubCategory;
    stats: CategoryStats;
    activity: CategoryActivity[];
}

export type SubCategoryReport = 'products' | 'inventory';

/** Which field a 409 was about. */
export type SubCategoryField = 'name' | 'category_code';

export type SubCategoryFormField = 'category_oid' | 'name' | 'category_code' | 'description' | 'status';
