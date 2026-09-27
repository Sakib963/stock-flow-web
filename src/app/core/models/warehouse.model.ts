/** A warehouse as the list, the form and the detail page see it. */
export interface Warehouse {
    oid: string;
    name: string;
    code: string;
    location: string | null;
    /** How many units the place holds, when the owner has said. */
    capacity_units: number | null;
    status: WarehouseStatus;
    created_by?: string | null;
    created_on?: string;
    last_action_by?: string | null;
    last_action_on?: string | null;
}

export type WarehouseStatus = 'Active' | 'Inactive';

/** What the form sends. `oid` is absent when the warehouse is being created. */
export interface WarehousePayload {
    oid?: string;
    name: string;
    code: string;
    location: string | null;
    capacity_units: number | null;
    status: WarehouseStatus;
}

/**
 * What is in a warehouse, computed by the server. Stock is where its purchase order line was
 * received. Low stock counts products here whose stock across every location is at their threshold.
 */
export interface WarehouseStats {
    products: number;
    onHand: number;
    sellable: number;
    /** At cost_price: what was spent on the stock that is physically here. */
    value: number;
    /** Units received into no aisle or zone. */
    unplaced: number;
    lowStock: number;
    zones: number;
    /** On hand over capacity, as a percent; null when no capacity was given. */
    fullRate: number | null;
}

export interface WarehouseActivity {
    /** The activity log row's own id, so two entries in the same millisecond do not collide. */
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

/** The reports a warehouse offers. Each one is a download, gated by `configuration.warehouse.export`. */
export type WarehouseReport = 'products' | 'inventory';

export interface WarehouseDetails {
    details: Warehouse;
    stats: WarehouseStats;
    activity: WarehouseActivity[];
}

/** Which field a 409 was about, so the form marks the input the person has to change. */
export type WarehouseField = 'name' | 'code';

/** Every control on the warehouse form, so the aria helpers cannot be asked about a field that is not there. */
export type WarehouseFormField = 'name' | 'code' | 'location' | 'capacity_units' | 'status';

