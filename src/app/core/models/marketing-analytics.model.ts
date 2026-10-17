import { PromotionType } from '@app/core/models/campaign.model';
import { PartnerType } from '@app/core/models/partner.model';
import { SalesChannel, SalesPeriod } from '@app/core/models/sales-analytics.model';

export interface MarketingCampaignWindow {
    oid: string;
    campaign_no: string;
    name: string;
    promotion_type: PromotionType;
    status: string;
    posting_start: string;
    posting_end: string;
    measure_end: string;
    /** Promises that went up in the period, pinned on their day. */
    posted: { day: string; kind: string; quantity: number; partner: string }[];
}

export interface MarketingOverview {
    period: SalesPeriod;
    channels: SalesChannel[];
    daily: { day: string; sales: number; first_time: number }[];
    campaigns: MarketingCampaignWindow[];
    /** What was given away to promote, at cost; null for someone who may not see buying prices. */
    given: { to_partners: number; gifts: number; units: number } | null;
}

export type CampaignVerdict = 'paid' | 'rose_not_paid' | 'no_rise' | 'too_little';

/** One campaign judged against the rest of the business (marketing analytics REQ-04 to REQ-08). */
export interface CampaignResult {
    oid: string;
    campaign_no: string;
    name: string;
    promotion_type: PromotionType;
    status: string;
    cost: number;
    no_cost_recorded: boolean;
    window_from: string;
    window_to: string;
    before_from: string;
    before_to: string;
    days: number;
    /** Still running: worked out on its days so far. */
    so_far: boolean;
    promoted_before: number;
    promoted_window: number;
    rest_before: number;
    rest_window: number;
    business_before: number;
    business_window: number;
    first_time: number;
    first_time_promoted: number;
    /** Promoted products that sold nothing before, so they are not judged (REQ-15). */
    not_judged: string[];
    /** Units below which nothing is judged, set by the server. */
    floor: number;
    verdict: CampaignVerdict;
    reason?: 'no_rest' | 'few_units';
    trend_percent?: number;
    expected?: number;
    extra?: number;
    /** Null, with `money_hidden`, for someone who may not see buying prices: they could be worked back from these. */
    profit_per_unit?: number | null;
    extra_profit?: number | null;
    return_per_taka?: number | null;
    /** The cost then leaves out products given, and the money figures above are null. */
    money_hidden?: boolean;
    overlaps: { oid: string; campaign_no: string; name: string; days: number; products: string[] }[];
    /** Who it brought (REQ-09): its first-time customers, and the buyers of the window before, by what is recorded on them. */
    brought: AudienceGroup[];
    usual: AudienceGroup[];
    districts: { oid: string; name_en: string; name_bn: string; customers: number }[];
}

export interface AudienceGroup {
    gender: 'Female' | 'Male' | null;
    age_band: string | null;
    customers: number;
}

/** Promotion types and partners compared over the period's campaigns (REQ-10, REQ-11). */
export interface MarketingComparisons {
    period: SalesPeriod;
    types: { promotion_type: PromotionType; campaigns: number; judged: number; cost: number; first_time: number; cost_per_first_time: number | null; return_per_taka: number | null }[];
    partners: { oid: string; name: string; partner_type: PartnerType; campaigns: number; fees: number; average_extra: number | null; first_time: number; on_time: number; late: number; missed: number; return_per_taka: number | null }[];
}

/** Online order sources compared (REQ-02); profit is null for someone who may not see buying prices. */
export interface MarketingSources {
    applies: boolean;
    period?: SalesPeriod;
    sources: { oid: string; name: string; platform: string; placed: number; sold: number; cancelled: number; refused: number; sales: number; profit: number | null; first_time: number }[];
}

export interface CampaignResults {
    period: SalesPeriod;
    results: CampaignResult[];
}
