# StockFlow

Sales and inventory management for small shops. One app for the counter, the online inbox, and the stock room.

**[Live preview](https://sakib963.github.io/stock-flow-web/)** · frontend only, sample data, sign in as guest

## What it does

**Selling**

- POS checkout with invoices and thermal-printer receipts
- Online orders with pre-orders, cancellations, and partial returns
- Returned items sorted into restock or disposal

**Stock**

- Product batches with purchase date and per-batch pricing
- Multi-warehouse inventory and stock overview
- Purchase orders, barcode generation, product disposal

**Running the shop**

- Campaigns and discounts
- Roles and permissions down to each action
- Manager view of invoices, returns, and disposed items
- Attendance tracking, internal notes, email OTP password reset

## Stack

| Layer    | Tech                                   |
| -------- | -------------------------------------- |
| Frontend | Angular, NG-ZORRO, TypeScript          |
| Backend  | Node.js, Express 5                     |
| Database | PostgreSQL                             |
| Testing  | Vitest, about 2,100 unit and API tests |

## Repositories

- `stock-flow-web`: this repo, the Angular client
- `stock-flow-server`: the REST API

## Run locally

```bash
git clone https://github.com/Sakib963/stock-flow-web.git
cd stock-flow-web
npm install
npm start
```

The app runs at `http://localhost:4200`. Point it at a running `stock-flow-server` for real data.

---

Built by [Abdullah Nazmus Sakib](https://sakib.app)
