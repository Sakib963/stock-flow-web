# 📊 Analytics Page Structure

## Route: `/configuration/analytics`

## Purpose

Centralized analytics and reporting page for **ALL** configuration entities:

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
  dateFrom?: string,    // Start date for analytics
  dateTo?: string       // End date for analytics
}
```

## Page Layout

### 1. **Page Header**

- Title: "Analytics & Reports"
- Breadcrumb: Configuration > Analytics
- Description: "View insights and trends for your inventory"
- Selected Entity Badge: `Category: Electronics` (dynamic)

### 2. **Filter Section**

```html
<nz-card>
    <div class="flex gap-4">
        <!-- Entity Type Selector -->
        <nz-select [(ngModel)]="filterType" placeholder="Analyze by" style="width: 200px;">
            <nz-option nzValue="category" nzLabel="Category"></nz-option>
            <nz-option nzValue="sub-category" nzLabel="Sub Category"></nz-option>
            <nz-option nzValue="brand" nzLabel="Brand"></nz-option>
            <nz-option nzValue="supplier" nzLabel="Supplier"></nz-option>
            <nz-option nzValue="warehouse" nzLabel="Warehouse"></nz-option>
            <nz-option nzValue="all" nzLabel="Overall"></nz-option>
        </nz-select>

        <!-- Entity Selector (Dynamic) -->
        <nz-select [(ngModel)]="entityId" [nzPlaceHolder]="'Select ' + filterType" style="width: 250px;" nzShowSearch>
            <!-- Populated dynamically -->
        </nz-select>

        <!-- Date Range Picker -->
        <nz-range-picker [(ngModel)]="dateRange" [nzFormat]="'yyyy-MM-dd'" (ngModelChange)="onDateChange()"> </nz-range-picker>

        <!-- Quick Date Filters -->
        <nz-button-group>
            <button nz-button (click)="setDateRange('today')">Today</button>
            <button nz-button (click)="setDateRange('week')">This Week</button>
            <button nz-button (click)="setDateRange('month')">This Month</button>
            <button nz-button (click)="setDateRange('year')">This Year</button>
        </nz-button-group>

        <!-- Actions -->
        <button nz-button nzType="primary" (click)="exportReport()">
            <nz-icon nzType="download"></nz-icon>
            Export Report
        </button>
    </div>
</nz-card>
```

### 3. **Key Metrics Summary**

```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <nz-card>
        <nz-statistic [nzValue]="metrics.totalProducts" nzTitle="Total Products" [nzPrefix]="prefixIcon"> </nz-statistic>
    </nz-card>

    <nz-card>
        <nz-statistic [nzValue]="metrics.totalInventoryValue" nzTitle="Total Value" nzPrefix="$" [nzValueStyle]="{ color: '#3f8600' }"> </nz-statistic>
    </nz-card>

    <nz-card>
        <nz-statistic [nzValue]="metrics.totalStock" nzTitle="Total Stock Units" [nzSuffix]="'units'"> </nz-statistic>
    </nz-card>

    <nz-card>
        <nz-statistic [nzValue]="metrics.avgTurnoverRate" nzTitle="Avg. Turnover Rate" [nzSuffix]="'%'" [nzPrecision]="2"> </nz-statistic>
    </nz-card>
</div>
```

### 4. **Charts Section**

```html
<!-- Stock Level Trend Chart -->
<nz-card nzTitle="Stock Level Trends" [nzExtra]="chartExtra" class="mb-4">
    <div echarts [options]="stockTrendOptions" style="height: 400px;"></div>
</nz-card>

<!-- Inventory Value Over Time -->
<nz-card nzTitle="Inventory Value Over Time" class="mb-4">
    <div echarts [options]="valueChartOptions" style="height: 350px;"></div>
</nz-card>

<!-- Top Products by Stock -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <nz-card nzTitle="Top 10 Products by Stock">
        <div echarts [options]="topProductsOptions" style="height: 300px;"></div>
    </nz-card>

    <nz-card nzTitle="Stock Distribution by Status">
        <div echarts [options]="stockDistributionOptions" style="height: 300px;"></div>
    </nz-card>
</div>
```

### 5. **Detailed Analytics Tables**

#### A. Product Performance Table

```html
<nz-card nzTitle="Product Performance" class="mb-4">
    <nz-table [nzData]="productPerformance" [nzSize]="'small'" [nzPageSize]="10">
        <thead>
            <tr>
                <th nzColumnKey="product" [nzSortFn]="sortFn">Product</th>
                <th nzColumnKey="stock" [nzSortFn]="sortFn">Current Stock</th>
                <th nzColumnKey="value" [nzSortFn]="sortFn">Value</th>
                <th nzColumnKey="purchases" [nzSortFn]="sortFn">Total Purchases</th>
                <th nzColumnKey="returns" [nzSortFn]="sortFn">Returns</th>
                <th nzColumnKey="disposed" [nzSortFn]="sortFn">Disposed</th>
                <th>Turnover Rate</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <tr *ngFor="let item of productPerformance">
                <td>
                    <div>{{ item.productName }}</div>
                    <small class="text-gray-500">{{ item.sku }}</small>
                </td>
                <td>
                    <nz-tag [nzColor]="getStockColor(item.stock, item.minStock)"> {{ item.stock }} </nz-tag>
                </td>
                <td>${{ item.value | number:'1.2-2' }}</td>
                <td>{{ item.totalPurchases }}</td>
                <td>{{ item.totalReturns }}</td>
                <td>{{ item.totalDisposed }}</td>
                <td>
                    <nz-progress [nzPercent]="item.turnoverRate" [nzStatus]="getTurnoverStatus(item.turnoverRate)" [nzShowInfo]="true"> </nz-progress>
                </td>
                <td>
                    <button nz-button nzType="link" nzSize="small" (click)="viewProduct(item.oid)">View</button>
                </td>
            </tr>
        </tbody>
    </nz-table>
</nz-card>
```

#### B. Stock Movement Summary

```html
<nz-card nzTitle="Stock Movement Summary">
    <nz-table [nzData]="stockMovements" [nzSize]="'small'">
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Value</th>
                <th>Reference</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>
            <tr *ngFor="let movement of stockMovements">
                <td>{{ movement.date | date:'short' }}</td>
                <td>
                    <nz-tag [nzColor]="getMovementColor(movement.type)"> {{ movement.type }} </nz-tag>
                </td>
                <td>{{ movement.quantity }}</td>
                <td>${{ movement.value | number:'1.2-2' }}</td>
                <td>
                    <a (click)="viewReference(movement.referenceType, movement.referenceId)"> {{ movement.referenceNo }} </a>
                </td>
                <td>{{ movement.notes }}</td>
            </tr>
        </tbody>
    </nz-table>
</nz-card>
```

### 6. **Insights & Alerts**

```html
<nz-card nzTitle="Insights & Recommendations" [nzExtra]="insightsExtra">
    <nz-list [nzDataSource]="insights" [nzRenderItem]="insightTemplate">
        <ng-template #insightTemplate let-item>
            <nz-list-item>
                <nz-list-item-meta [nzAvatar]="item.icon" [nzTitle]="item.title" [nzDescription]="item.description"> </nz-list-item-meta>
                <ul nz-list-item-actions>
                    <nz-list-item-action>
                        <button nz-button nzType="link" (click)="takeAction(item.action)">{{ item.actionLabel }}</button>
                    </nz-list-item-action>
                </ul>
            </nz-list-item>
        </ng-template>
    </nz-list>
</nz-card>
```

## API Endpoints Needed

```typescript
// Get analytics data
GET /api/configuration/analytics?type=category&id=xxx&from=2026-01-01&to=2026-01-31

// Response structure
{
  metrics: {
    totalProducts: number,
    totalInventoryValue: number,
    totalStock: number,
    avgTurnoverRate: number
  },
  charts: {
    stockTrend: { dates: string[], values: number[] },
    valueTrend: { dates: string[], values: number[] },
    topProducts: { names: string[], stocks: number[] },
    stockDistribution: { labels: string[], values: number[] }
  },
  productPerformance: [
    {
      oid: string,
      productName: string,
      sku: string,
      stock: number,
      minStock: number,
      value: number,
      totalPurchases: number,
      totalReturns: number,
      totalDisposed: number,
      turnoverRate: number
    }
  ],
  stockMovements: [
    {
      date: string,
      type: 'Purchase' | 'Return' | 'Dispose' | 'Transfer',
      quantity: number,
      value: number,
      referenceType: string,
      referenceId: string,
      referenceNo: string,
      notes: string
    }
  ],
  insights: [
    {
      icon: string,
      title: string,
      description: string,
      action: string,
      actionLabel: string
    }
  ]
}
```

## Component Structure

```
src/app/modules/configuration/pages/
└── analytics/
    ├── analytics.component.ts
    ├── analytics.component.html
    ├── analytics.component.scss
    └── analytics.component.spec.ts
```

## Chart Library

Use **Apache ECharts** (already popular in Angular ecosystem):

```bash
npm install echarts ngx-echarts
```

## Key Features

1. ✅ Works for ALL configuration entities
2. ✅ Date range filtering
3. ✅ Interactive charts (ECharts)
4. ✅ Detailed performance metrics
5. ✅ Export to Excel/PDF
6. ✅ AI-driven insights (future)
7. ✅ Comparison mode (compare multiple entities)
8. ✅ Real-time data updates
