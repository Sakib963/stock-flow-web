# Purchase Cost Intelligence Rollout

## Rules

- [x] Track work task by task and mark completion only after implementation plus validation.
- [x] Keep inventory cost_price semantics unchanged.
- [x] Keep new cost inputs optional unless explicitly required by intended use.
- [x] Add tooltip/help text for every new cost-related input.

## Phase 0: Tracker Setup

- [x] Create this task file and confirm ownership/scope.

## Phase 1: Documentation

- [x] Create feature spec file in purchase-order directory with business case and domain decisions.
- [x] Document purchase-centric data ownership and why inventory table remains unchanged.

## Phase 2: Database

- [x] Add purchase_details_cost_profile table in schema.
- [x] Add fields: purchase_details_oid unique FK, optional cost fields, cost_remarks, audit metadata.
- [x] Keep purchase, purchase_details, and inventory table definitions unchanged for existing columns.

## Phase 3: Backend Verify Write Path

- [x] Update verify schema for optional costs and remarks.
- [x] Persist profile data during verify using purchase_details_oid relation.
- [x] Keep existing purchase and inventory writes unchanged.

## Phase 4: Backend Read and Update Paths

- [x] Extend purchase details API to include profile data.
- [x] Extend pricing update endpoint to upsert profile data.
- [x] Keep null-safe fallback when profile row does not exist.

## Phase 5: Frontend Verify Form

- [x] Add optional cost fields and remarks for for_sale items.
- [x] Keep selling price and maximum discount (BDT) validation for for_sale items.
- [x] Add tooltip/help text for every related input.
- [x] Add live unit-profit hint and negative-profit confirmation.

## Phase 6: Frontend Pricing Update Form

- [x] Add optional cost fields and remarks in pricing update UI.
- [x] Add matching tooltip/help text and profitability hint behavior.
- [x] Align payload with backend update contract.

## Phase 7: Detail and Reports

- [x] Display optional cost profile data in purchase detail response/UI.
- [x] Update purchase summary/products reports with purchase-centric joins.
- [x] Keep report compatibility for rows without profile data.

## Phase 8: Validation and Rollout

- [ ] Validate create, update, verify, cancel flows remain stable.
- [ ] Validate old records and mixed records with and without profile rows.
- [x] Run frontend build and backend smoke tests.
- [ ] Final regression review and sign-off.
