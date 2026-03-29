# Purchase Order Cost Intelligence

## Purpose

This feature adds optional per-unit operational and marketing cost planning fields during purchase verification and pricing updates, while preserving the existing production-safe behavior of purchase and inventory flows.

## Business Case

- Selling price alone does not explain actual unit profitability.
- Teams need to track planned overheads like ad run, packaging, gift, content creation, and influencer costs.
- Decision makers need context notes to compare planned vs actual execution.
- Sales discount control requires a BDT-based maximum discount cap for each sale-ready item.

## Domain Decision

### Why this is purchase-centric

Purchase verification already stores verified quantity and verified unit price in purchase_details.
To keep purchase detail screens aligned with purchase-domain tables, optional planning costs should be tied to purchase details, not only inventory.

### Why inventory core columns remain unchanged

- inventory.cost_price is the immutable acquisition cost per unit.
- Existing production flows and reports rely on current inventory semantics.
- We avoid risky regressions by adding a separate extension table for optional costs.

## Data Model

Create a new table:

- purchase_details_cost_profile

Suggested columns:

- oid (PK)
- purchase_details_oid (unique FK -> purchase_details.oid)
- ad_run_cost numeric (optional, non-negative)
- packaging_cost numeric (optional, non-negative)
- gift_cost numeric (optional, non-negative)
- content_creation_cost numeric (optional, non-negative)
- influencer_cost numeric (optional, non-negative)
- cost_remarks text (optional)
- created_by, created_on, edited_by, edited_on

## Write Flow

1. Purchase is created as Submitted.
2. During verification:

- purchase_details gets verified quantity and verified unit price.
- inventory gets cost_price, selling_price, maximum_discount, intended_use, status.
- purchase_details_cost_profile gets optional cost fields and remarks when provided.

## Update Flow

- Post-verify optional cost updates are allowed from inventory pricing UI only.
- Update path uses inventory.purchase_details_oid to upsert into purchase_details_cost_profile.
- Purchase status rules remain unchanged.

## Validation Rules

For intended_use = for_sale:

- selling_price is required.
- maximum_discount is required and interpreted as BDT cap.
- optional cost fields remain optional but must be non-negative when present.

For intended_use = internal_use:

- selling_price and maximum_discount are optional/cleared per existing behavior.
- optional cost fields can remain empty.

## Profitability Hint

Unit hint formula:
unit_profit = selling_price - verified_unit_price - (ad_run_cost + packaging_cost + gift_cost + content_creation_cost + influencer_cost)

Behavior:

- Show live hint in verify and pricing update forms.
- If unit_profit is negative, show warning and require explicit confirmation before submit.

## Tooltip Requirements

Every related input must provide concise help text:

- Selling Price
- Maximum Discount (BDT)
- Ad Run Cost
- Packaging Cost
- Gift Cost
- Content Creation Cost
- Influencer Cost
- Cost Remarks

Tooltip style should follow existing form UI patterns and remain consistent across verification and pricing update forms.

## Backward Compatibility

- Existing records without purchase_details_cost_profile rows must continue to work.
- Reads must use null-safe defaults (treat missing costs as 0 in calculations).
- Existing create/update/verify/cancel flows must remain unaffected when new optional fields are not provided.

## Rollout Strategy

1. Add schema table first.
2. Add backend support for optional read/write.
3. Add frontend form fields/tooltips/hints.
4. Add report enrichment with safe joins.
5. Validate mixed data (with and without profile rows).
