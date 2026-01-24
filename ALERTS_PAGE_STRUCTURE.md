# 📋 Alerts & Low Stock Page Structure

## Route: `/configuration/alerts`

## Purpose

Centralized page to view and manage stock alerts across **ALL** configuration entities:

- Category
- Sub Category
- Brand
- Supplier
- Product
- Warehouse

## Query Parameters

```typescript
{
  type: 'category' | 'sub-category' | 'brand' | 'supplier' | 'product' | 'warehouse',
  id: string,           // Entity OID
  name: string,         // Entity name (for display)
  alert?: 'low-stock' | 'out-of-stock' | 'expiring'  // Default filter
}
```

## Page Layout

### 1. **Page Header**

- Title: "Alerts & Low Stock"
- Breadcrumb: Configuration > Alerts
- Description: "Monitor stock levels and alerts across your inventory"

### 2. **Filter Section**

```html
<nz-card>
    <!-- Entity Type Selector -->
    <nz-select [(ngModel)]="filterType" placeholder="Filter by">
        <nz-option nzValue="all" nzLabel="All Products"></nz-option>
        <nz-option nzValue="category" nzLabel="Category"></nz-option>
        <nz-option nzValue="sub-category" nzLabel="Sub Category"></nz-option>
        <nz-option nzValue="brand" nzLabel="Brand"></nz-option>
        <nz-option nzValue="supplier" nzLabel="Supplier"></nz-option>
        <nz-option nzValue="warehouse" nzLabel="Warehouse"></nz-option>
    </nz-select>

    <!-- Entity Selector (Dynamic based on type) -->
    <nz-select [(ngModel)]="entityId" [nzPlaceHolder]="'Select ' + filterType">
        <!-- Populated dynamically -->
    </nz-select>

    <!-- Alert Type Filter -->
    <nz-segmented [nzOptions]="alertTypes" [(ngModel)]="alertType">
        <!-- All / Low Stock / Out of Stock / Expiring Soon -->
    </nz-segmented>

    <!-- Search -->
    <nz-input-group nzSearch>
        <input nz-input placeholder="Search products..." [(ngModel)]="searchTerm" />
    </nz-input-group>
</nz-card>
```

### 3. **Statistics Summary**

```html
<div class="grid grid-cols-4 gap-4">
    <nz-card>
        <nz-statistic [nzValue]="stats.lowStockCount" nzTitle="Low Stock Items" [nzValueStyle]="{ color: '#faad14' }"> </nz-statistic>
    </nz-card>

    <nz-card>
        <nz-statistic [nzValue]="stats.outOfStockCount" nzTitle="Out of Stock" [nzValueStyle]="{ color: '#cf1322' }"> </nz-statistic>
    </nz-card>

    <nz-card>
        <nz-statistic [nzValue]="stats.expiringCount" nzTitle="Expiring Soon"> </nz-statistic>
    </nz-card>

    <nz-card>
        <nz-statistic [nzValue]="stats.totalValue" nzTitle="Total Value at Risk" nzPrefix="$"> </nz-statistic>
    </nz-card>
</div>
```

### 4. **Products Table**

```html
<nz-table [nzData]="products" [nzLoading]="loading">
    <thead>
        <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Warehouse</th>
            <th>Current Stock</th>
            <th>Min Stock</th>
            <th>Status</th>
            <th>Batch Expiry</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody>
        <tr *ngFor="let product of products">
            <td>{{ product.name }}</td>
            <td><code>{{ product.sku }}</code></td>
            <td>{{ product.category }}</td>
            <td>{{ product.warehouse }}</td>
            <td>
                <nz-tag [nzColor]="getStockColor(product.stock)"> {{ product.stock }} </nz-tag>
            </td>
            <td>{{ product.minStock }}</td>
            <td>
                <nz-tag *ngIf="product.stock === 0" nzColor="error">Out of Stock</nz-tag>
                <nz-tag *ngIf="product.stock > 0 && product.stock < product.minStock" nzColor="warning"> Low Stock </nz-tag>
            </td>
            <td>
                <span *ngIf="product.nearestExpiry"> {{ product.nearestExpiry | date }} </span>
            </td>
            <td>
                <button nz-button nzType="link" (click)="viewProduct(product.oid)">View</button>
                <button nz-button nzType="link" (click)="createPurchaseOrder(product.oid)">Reorder</button>
            </td>
        </tr>
    </tbody>
</nz-table>
```

### 5. **Actions**

- Export to Excel
- Generate Alert Report
- Create Bulk Purchase Order
- Configure Alert Thresholds

## API Endpoints Needed

```typescript
// Get alerts by filter
GET /api/configuration/alerts?type=category&id=xxx&alert=low-stock

// Get statistics
GET /api/configuration/alerts/stats?type=category&id=xxx

// Response structure
{
  products: [
    {
      oid: string,
      name: string,
      sku: string,
      category: string,
      categoryId: string,
      warehouse: string,
      warehouseId: string,
      stock: number,
      minStock: number,
      price: number,
      nearestExpiry: string | null,
      batches: [{
        batchNo: string,
        quantity: number,
        expiryDate: string
      }]
    }
  ],
  stats: {
    lowStockCount: number,
    outOfStockCount: number,
    expiringCount: number,
    totalValue: number
  }
}
```

## Component Structure

```
src/app/modules/configuration/pages/
└── alerts/
    ├── alerts.component.ts
    ├── alerts.component.html
    ├── alerts.component.scss
    └── alerts.component.spec.ts
```

## Key Features

1. ✅ Works for ALL configuration entities
2. ✅ Dynamic filtering and search
3. ✅ Real-time stock status
4. ✅ Quick reorder actions
5. ✅ Export functionality
6. ✅ Batch expiry tracking
