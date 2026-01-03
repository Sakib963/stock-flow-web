# Stockflow – Order, Delivery & Sale Execution Plan

> **Purpose**: A simple, practical, build-ready guide to implement online / conversational orders (Veltro-ready) without over‑engineering.  
> **Audience**: You (developer) + future-you.  
> **Timeline**: 7–10 days.  
> **Status**: **FROZEN PLAN** – no more design debates.

---

## 1. Core Philosophy (Read This First)

This system is built for **real Facebook / WhatsApp sellers**, not accountants.

**Golden rules**:
- Orders = intent & operations
- Sales = final invoice
- Payments = events
- One order → max one sale
- We track *what customer paid*, not profit math
- Simplicity > theoretical perfection

If a feature violates these → **do not build it now**.

---

## 2. Identifiers (Very Important)

### 2.1 Order Number
- Generated at order creation
- Used for packaging, courier talk, support
- Human-friendly

Example:
```
ORD-260103-001
```

### 2.2 Invoice Number
- Generated only when sale is created
- Accounting reference
- Existing logic stays

Example:
```
2601030001
```

### UX Rule (Critical)
Once a sale exists, **ALWAYS show both**:
```
Order No   : ORD-260103-001
Invoice No : 2601030001
```

---

## 3. Order Lifecycle & Delivery States

```
Draft
Placed
Packaging
OutForDelivery
Delivered
Returned
Cancelled
```

### Meaning
- **Draft** – order being typed
- **Placed** – customer confirmed, stock reserved
- **Packaging** – packing started, invoice printed
- **OutForDelivery** – handed to courier
- **Delivered** – courier delivered
- **Returned** – delivery failed
- **Cancelled** – cancelled before delivery

All transitions are **manual for now**.

---

## 4. Data Model (Minimal & Final)

### 4.1 Orders
Stores conversational intent and pricing snapshot.

```
orders
- oid
- order_no
- customer_name
- customer_phone
- customer_address
- subtotal_amount
- discount_amount
- delivery_charge
- total_payable
- status
- created_on
- served_on
- sales_oid (nullable)
```

---

### 4.2 Order Items

```
order_items
- oid
- order_oid
- inventory_oid
- product_oid
- product_name
- unit_price
- quantity
- line_total
```

---

### 4.3 Order Payments (Advance / Partial)

```
order_payments
- oid
- order_oid
- amount
- payment_method (bkash, nagad, bank, cash)
- trx_id
- paid_on
```

---

### 4.4 Inventory (Extension)

```
inventory
+ quantity_reserved
```

Rules:
- Reserved ≠ sold
- Deduction only on sale creation

---

### 4.5 Sales (Existing – Meaning Locked)

```
sales.total_amount = total customer payable
```

Sale is created **only when order is served**.

---

### 4.6 Sales Payments

```
sales_payments
- oid
- sales_oid
- amount
- payment_method
- trx_id
- paid_on
```

---

## 5. Operator Workflow (Real Life)

### Scenario: “I got 20 orders in Facebook messages”

#### Step 1 – Create Orders
- Open Orders → Create Order
- Fill customer + products + price
- Save as Draft

#### Step 2 – Customer Confirms
- Change status → Placed
- System reserves inventory

#### Step 3 – Advance Payment (Optional)
- Add payment with trxID

#### Step 4 – Packaging
- Status → Packaging
- Print **Order Invoice**
- Pack items

#### Step 5 – Hand to Courier
- Status → OutForDelivery
- (Optional note: courier name)

#### Step 6 – Courier Feedback

**Delivered**:
- Status → Delivered
- Click **Serve Order**

**Returned**:
- Status → Returned
- Inventory released

---

## 6. Serve Order (Most Important Action)

This is an **atomic operation**:

1. Create Sale
2. Generate invoice number
3. Create sales_details
4. Copy payments
5. Add COD payment if needed
6. Deduct inventory
7. Link order → sale

After this:
- Order = Served
- Sale = Purchased

---

## 7. Invoice Printing Rules

### Before Delivery (Packaging)

```
INVOICE (ORDER)
Order No   : ORD-260103-001
Status     : Pending Delivery
Total      : 2150
```

### After Delivery (Final)

```
INVOICE
Invoice No : 2601030001
Order No   : ORD-260103-001
Total      : 2150
```

Never hide either number.

---

## 8. Payment Status Logic

```
paid_sum = SUM(sales_payments.amount)

IF paid_sum == 0 → unpaid
IF paid_sum < total → partially_paid
IF paid_sum >= total → paid
```

No overrides.

---

## 9. What We Will NOT Build (Strict)

- Courier API integration
- Settlement tracking
- Profit calculation
- WooCommerce sync
- Multi-tenancy
- Analytics dashboards

These are **future features**.

---

## 10. 7-Day Task Plan

### Day 1
- Create DB tables
- Migrations

### Day 2
- Order creation
- Order items
- Pricing calc

### Day 3
- Inventory reservation
- Status transitions

### Day 4
- Order payments
- trxID support

### Day 5
- Serve Order → Sale
- Sales payments

### Day 6
- Invoice printing
- UI polish

### Day 7
- Bug fixes
- Demo data
- Sanity testing

---

## 11. Definition of DONE

This feature is DONE when:
- Orders can be created from FB chats
- Advance payments are tracked
- Inventory is reserved correctly
- Orders can be packed & invoiced
- Courier delivery leads to sale
- Owners can understand the flow in 2 minutes

---

## 12. Final Rule (Read Before Coding)

> If a feature is not required to **take an order, pack it, deliver it, and finalize it**, it is out of scope.

---

**Start building. This document is your contract with yourself.**

