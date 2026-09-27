import { WarehouseActivity } from '@app/core/models/warehouse.model';

/** An aisle or zone inside a warehouse, as the list, the form and the detail page see it. */
export interface Aisle {
    oid: string;
    name: string;
    code: string;
    warehouse_oid: string;
    warehouse_name?: string;
    storage_type: AisleStorageType | null;
    capacity_units: number | null;
    special_notes: string | null;
    status: AisleStatus;
    created_by?: string | null;
    created_on?: string;
    last_action_by?: string | null;
    last_action_on?: string | null;
}

export type AisleStatus = 'Active' | 'Inactive';

export const AISLE_STORAGE_TYPES = ['shelf', 'rack', 'cupboard', 'box', 'hanger', 'showcase', 'cold', 'other'] as const;
export type AisleStorageType = (typeof AISLE_STORAGE_TYPES)[number];

/** What is on the aisle, the same rules as a warehouse. */
export interface AisleStats {
    products: number;
    onHand: number;
    sellable: number;
    value: number;
    lowStock: number;
    fullRate: number | null;
}

/** One product on the aisle. `low` follows its threshold across every location. */
export interface AisleItem {
    product_oid: string;
    name: string;
    onHand: number;
    sellable: number;
    low: boolean;
}

export interface AislePayload {
    oid?: string;
    name: string;
    code: string;
    warehouse_oid: string;
    storage_type: AisleStorageType | null;
    capacity_units: number | null;
    special_notes: string | null;
    status: AisleStatus;
}

export interface AisleDetails {
    details: Aisle;
    stats: AisleStats;
    items: AisleItem[];
    activity: WarehouseActivity[];
}

export type AisleReport = 'products' | 'inventory';

/** Which field a 409 was about. */
export type AisleField = 'name' | 'code';

export type AisleFormField = 'warehouse_oid' | 'name' | 'code' | 'storage_type' | 'capacity_units' | 'special_notes' | 'status';
