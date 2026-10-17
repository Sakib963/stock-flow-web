export const PARTNER_TYPES = ['Person', 'Page', 'Business'] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'Other'] as const;
export type PartnerPlatform = (typeof PARTNER_PLATFORMS)[number];

export const PARTNER_PAYMENT_METHODS = ['bKash', 'Nagad', 'Bank', 'Cash'] as const;
export type PartnerPaymentMethod = (typeof PARTNER_PAYMENT_METHODS)[number];

export type PartnerStatus = 'Active' | 'Inactive';

/** Whoever promotes the business: a person, a page or group, or an agency. */
export interface Partner {
    oid: string;
    name: string;
    partner_type: PartnerType;
    platforms: PartnerPlatform[];
    handle: string | null;
    phone_number: string | null;
    /** Where fees are sent. Recorded only: the app never moves money. */
    payment_method: PartnerPaymentMethod | null;
    payment_account: string | null;
    note: string | null;
    status: PartnerStatus;
    created_by?: string | null;
    created_on?: string;
    last_action_by?: string | null;
    last_action_on?: string | null;
}

/** What the form sends. `oid` is absent when the partner is being created. */
export type PartnerPayload = Omit<Partner, 'oid' | 'created_by' | 'created_on' | 'last_action_by' | 'last_action_on'> & { oid?: string };

export interface PartnerActivity {
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

/** A campaign the partner is on. Paid and owed only for someone who may see payments. */
export interface PartnerCampaign {
    oid: string;
    campaign_no: string;
    name: string;
    status: string;
    posting_start: string;
    agreed_fee: number;
    /** Promised posts still Pending after their due day: a hint, nothing changes by itself. */
    past_due: number;
    paid?: number;
    owed?: number;
}

export interface PartnerDetails {
    details: Partner;
    /** Null for someone who may not see campaigns. */
    campaigns: PartnerCampaign[] | null;
    activity: PartnerActivity[];
}

export type PartnerFormField = 'name' | 'partner_type' | 'platforms' | 'handle' | 'phone_number' | 'payment_method' | 'payment_account' | 'note' | 'status';
