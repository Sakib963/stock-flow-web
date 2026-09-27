/** A supplier as the list, the form and the detail page see it. */
export interface Supplier {
    oid: string;
    name: string;
    contact_person: string | null;
    phone_number: string;
    whatsapp_number: string | null;
    email: string | null;
    address: string | null;
    /** Where dues are sent: a bank account, a bKash or Nagad number. Recorded only. */
    payment_details: string | null;
    status: SupplierStatus;
    created_by?: string | null;
    created_on?: string;
    last_action_by?: string | null;
    last_action_on?: string | null;
}

export type SupplierStatus = 'Active' | 'Inactive';

/** What the form sends. `oid` is absent when the supplier is being created. */
export interface SupplierPayload {
    oid?: string;
    name: string;
    contact_person: string | null;
    phone_number: string;
    whatsapp_number: string | null;
    email: string | null;
    address: string | null;
    payment_details: string | null;
    status: SupplierStatus;
}

/**
 * What an owner opens a supplier to find out, computed by the server. Money covers received
 * (Verified) purchase orders only, on the order total the owner recorded. A rate with nothing to
 * divide by is null, never 0.
 */
export interface SupplierStats {
    orders: number;
    openOrders: number;
    spent: number;
    paid: number;
    owed: number;
    /** What actually arrived, at the received price. Spent and owed stay on the recorded order total. */
    receivedValue: number;
    lastPurchaseOn: string | null;
    leadDays: number | null;
    promisedOrders: number;
    onTimeRate: number | null;
    unitsOrdered: number;
    unitsReceived: number;
    shortRate: number | null;
    faultyUnits: number;
    faultyRate: number | null;
    unitsSold: number;
    sellThrough: number | null;
    sales: number;
    profit: number;
}

export interface SupplierActivity {
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

/** The reports a supplier offers. Each one is a download, gated by `configuration.supplier.export`. */
export type SupplierReport = 'performance' | 'data';

export interface SupplierDetails {
    details: Supplier;
    stats: SupplierStats;
    activity: SupplierActivity[];
}

/** Which field a 409 was about, so the form marks the input the person has to change. */
export type SupplierField = 'name' | 'phone_number';

export type SupplierFormField = 'name' | 'contact_person' | 'phone_number' | 'whatsapp_number' | 'email' | 'address' | 'payment_details' | 'status';
