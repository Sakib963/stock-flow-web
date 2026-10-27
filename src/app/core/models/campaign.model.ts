import { PartnerPaymentMethod, PartnerPlatform, PartnerType } from '@app/core/models/partner.model';

export const PROMOTION_TYPES = ['InfluencerPost', 'BoostedAd', 'Seeding', 'Live', 'PageShare', 'DiscountOffer'] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

export type CampaignStatus = 'Planned' | 'Live' | 'Completed' | 'Cancelled';

/** The status changes a person presses on a campaign. */
export type CampaignMove = 'start' | 'complete' | 'cancel';

/** The marketing budgets a batch carries per unit, which a campaign's planned budget is worked out from. */
export const BUDGET_KINDS = ['influencer_cost', 'ad_run_cost', 'gift_cost', 'content_creation_cost'] as const;
export type BudgetKind = (typeof BUDGET_KINDS)[number];
export type BatchBudgets = Record<BudgetKind, number>;

export interface CampaignBatch extends BatchBudgets {
    /** The batch, `inventory_oid` on the server. */
    inventory_oid: string;
    batch_code: string;
    product_oid: string;
    product_name: string;
    sku: string | null;
    /** The batch's units when it came in: its budget for the whole batch is per unit times this. */
    units: number;
    on_hand: number;
}

/** One payment recorded against a partner on a campaign. Recorded only: no money moves through the app. */
export interface PartnerPayment {
    oid: string;
    amount: number;
    paid_on: string;
    payment_method: PartnerPaymentMethod;
    reference: string | null;
    note: string | null;
}

export interface PartnerPaymentPayload {
    oid: string;
    campaign_partner_oid: string;
    amount: number;
    paid_on: string;
    payment_method: PartnerPaymentMethod;
    reference: string | null;
    note: string | null;
}

export const DELIVERABLE_KINDS = ['Post', 'Reel', 'Story', 'Live', 'AdDays', 'Other'] as const;
export type DeliverableKind = (typeof DELIVERABLE_KINDS)[number];
export const DELIVERABLE_STATUSES = ['Pending', 'Posted', 'Late', 'Missed'] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

/** One promised piece of work. Its status is set by a person; `past_due` is only a hint (REQ-12). */
export interface Deliverable {
    oid: string;
    /** The row version an edit sends back, so a form opened before someone else saved is refused. */
    version?: string;
    kind: DeliverableKind;
    quantity: number;
    due_on: string;
    status: DeliverableStatus;
    link: string | null;
    posted_on: string | null;
    note: string | null;
    past_due: boolean;
}

export interface DeliverablePayload {
    oid: string;
    campaign_partner_oid?: string;
    kind: DeliverableKind;
    quantity: number;
    due_on: string;
    status: DeliverableStatus;
    link: string | null;
    posted_on: string | null;
    note: string | null;
}

export interface CampaignPartner {
    /** The partner's line on this campaign, which payments point at; absent until it is saved. */
    oid?: string;
    partner_oid: string;
    name: string;
    partner_type: PartnerType;
    agreed_fee: number;
    note: string | null;
    payment_method?: PartnerPaymentMethod | null;
    /** Sent only to someone who may see payments to partners. */
    paid?: number;
    owed?: number;
    payments?: PartnerPayment[];
    /** Products given to this partner for the campaign; cost only for someone who may see buying prices. */
    giveaways?: { oid: string; giveaway_no: string; status: string; units: number; cost?: number }[];
    deliverables?: Deliverable[];
}

export interface Campaign {
    oid: string;
    /** The row version an edit sends back, so a form opened before someone else saved is refused. */
    version?: string;
    campaign_no: string;
    name: string;
    promotion_type: PromotionType;
    status: CampaignStatus;
    posting_start: string;
    posting_end: string;
    measure_end: string;
    /** Null when not recorded, which the page says rather than showing 0. */
    ad_spend: number | null;
    other_cost: number | null;
    other_cost_note: string | null;
    note: string | null;
    cancel_note?: string | null;
    created_on?: string;
    created_by?: string | null;
    partners?: number;
    agreed_cost?: number;
}

export interface CampaignCosts {
    planned: BatchBudgets & { total: number };
    /** `products` is null for someone who may not see buying prices, and then left out of the total. */
    agreed: { fees: number; ad_spend: number | null; other_cost: number | null; products: number | null; total: number };
    /** Agreed less planned: above 0 is over the budget. */
    difference: number;
    /** Each kind of cost over the promoted batches' budget for it, with a batch to open (REQ-08). */
    over: { kind: BudgetKind; agreed: number; planned: number; over: number; product_oid: string; batch_code: string }[];
}

export interface CampaignActivity {
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

export interface CampaignDetails {
    details: Campaign;
    batches: CampaignBatch[];
    partners: CampaignPartner[];
    costs: CampaignCosts;
    /** Whether paid, owed and the payments are in the partners: only with the payments permission. */
    payments_shown: boolean;
    activity: CampaignActivity[];
}

export interface CampaignPayload {
    oid: string;
    name: string;
    promotion_type: PromotionType;
    posting_start: string;
    posting_end: string;
    measure_end: string | null;
    ad_spend: number | null;
    other_cost: number | null;
    other_cost_note: string | null;
    note: string | null;
    batches: string[];
    partners: { partner_oid: string; agreed_fee: number; note: string | null }[];
}

/** A product as the campaign's batch picker offers it, with the batches still on the shelf. */
export interface PromotableProduct {
    oid: string;
    name: string;
    sku: string | null;
    category_name?: string | null;
    sub_category_name?: string | null;
    batches: ({ oid: string; batch_code: string; units: number; on_hand: number; warehouse_name: string | null } & BatchBudgets)[];
}

export interface PartnerChoice {
    oid: string;
    /** The oid again, the key every searching picker reads. */
    value: string;
    name: string;
    partner_type: PartnerType;
    platforms: PartnerPlatform[];
    handle: string | null;
}

/** A batch's budget for one kind, or all four, per unit. */
export const budgetPerUnit = (batch: BatchBudgets): number => BUDGET_KINDS.reduce((sum, key) => sum + Number(batch[key]), 0);
