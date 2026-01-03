# Module Dashboard Implementation Guide

## Overview
This project implements module-specific dashboards that provide focused insights for each module (Configuration, Inventory, Sales, etc.). Each dashboard displays relevant metrics, quick actions, and recent activities specific to that module.

## Configuration Dashboard

### Location
- **Component**: `src/app/modules/configuration/pages/configuration-dashboard/`
- **Route**: `/configuration/dashboard`
- **Breadcrumb Key**: `configuration.dashboard.overview`

### Features
1. **Statistics Cards** - 8 cards displaying:
   - Categories (48)
   - Sub Categories (156)
   - Brands (89)
   - Suppliers (34)
   - Products (523)
   - Warehouses (12)
   - Aisles/Zones (87)
   - Total Items (949)
   - Each card shows trend indicators (up/down arrows with monthly changes)

2. **Quick Actions** - Fast access buttons for:
   - Add Category
   - Add Brand
   - Add Supplier
   - Add Product

3. **Category Distribution** - Visual breakdown showing:
   - Electronics (35%)
   - Clothing (25%)
   - Food & Beverage (20%)
   - Home & Garden (15%)
   - Others (5%)

4. **Recent Activities** - Timeline of recent changes:
   - New Category Created
   - Brand Updated
   - Supplier Added
   - Product Updated
   - Warehouse Created

5. **Suppliers by Region** - Geographic distribution:
   - North America (12)
   - Europe (10)
   - Asia (8)
   - Others (4)

6. **Configuration Health** - System metrics:
   - Data Completeness (94%)
   - Active Categories (46/48)
   - Products with Images (487/523)

7. **Quick Statistics** - Key metrics:
   - Avg. Products per Category (10.9)
   - Active Suppliers (32/34)
   - Warehouse Capacity (78%)

8. **Bottom Action Cards**:
   - Configuration Reports
   - Import Data
   - Bulk import categories, products & more

## Creating Dashboards for Other Modules

### Step 1: Create Dashboard Component
```bash
# For Inventory Module
ng g c modules/inventory/pages/inventory-dashboard --standalone

# For Sales Module
ng g c modules/sales/pages/sales-dashboard --standalone
```

### Step 2: Update Module Routing
Add dashboard route at the top of your module routing:

```typescript
const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/inventory-dashboard/inventory-dashboard.component')
        .then((m) => m.InventoryDashboardComponent),
  },
  // ... other routes
];
```

### Step 3: Add Breadcrumb Configuration
Update your module's breadcrumb config:

```typescript
export const INVENTORY_BREADCRUMBS: ModuleBreadcrumbConfig = {
  dashboard: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Inventory', url: '/inventory/dashboard' }
    ],
    pages: {
      overview: [{ label: 'Dashboard', url: '/inventory/dashboard' }],
    }
  },
  // ... other features
};
```

### Step 4: Update Menu Configuration
Add dashboard item to menu:

```typescript
{
  group: 'Inventory',
  icon: 'assets/icons/inventory-group.svg',
  items: [
    {
      icon: 'dashboard',
      label: 'Dashboard',
      route: '/inventory/dashboard',
    },
    // ... other items
  ],
}
```

### Step 5: Update Global Breadcrumb Registry
Register your module's breadcrumbs:

```typescript
export const BREADCRUMB_REGISTRY: BreadcrumbRegistry = {
  configuration: CONFIGURATION_BREADCRUMBS,
  inventory: INVENTORY_BREADCRUMBS, // Add this
  sales: SALES_BREADCRUMBS, // Add this
  // ... other modules
};
```

## Dashboard Design Guidelines

### 1. **Statistics Cards**
- Use 4-column grid on desktop (responsive)
- Show icon with brand color in circle
- Display current count prominently
- Include trend indicator (arrow up/down)
- Make cards clickable to navigate to detail pages

### 2. **Quick Actions**
- Limit to 4-6 primary actions
- Use consistent button styling
- Link to create/add pages
- Group related actions together

### 3. **Charts and Visualizations**
- Use ng-zorro progress bars for simple metrics
- Show percentages with visual indicators
- Use consistent color scheme (#594ED1 primary)
- Keep visualizations simple and clear

### 4. **Recent Activities**
- Use timeline component
- Show last 5-7 activities
- Include timestamp
- Use color-coded icons (green=create, blue=update, red=delete)
- Link to "View All" page

### 5. **Health Metrics**
- Show system health indicators
- Use progress bars for completion rates
- Display warnings if metrics are low
- Use semantic colors (green=good, yellow=warning, red=error)

### 6. **Responsive Design**
- Mobile: Single column layout
- Tablet: 2 columns
- Desktop: 3-4 columns
- Use Tailwind grid classes

## Mock Data Structure

### Statistics Card
```typescript
interface StatCard {
  title: string;
  count: number;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  route: string;
}
```

### Quick Action
```typescript
interface QuickAction {
  label: string;
  icon: string;
  route: string;
  color: string;
}
```

### Recent Activity
```typescript
interface RecentActivity {
  title: string;
  description: string;
  time: string;
  icon: string;
  type: 'create' | 'update' | 'delete';
}
```

## API Integration (Future)

When ready to integrate with backend APIs:

1. Create dashboard service in module services folder
2. Define API endpoints in `core/constants/api-endpoint.ts`
3. Replace mock data loading with service calls
4. Add error handling and loading states
5. Implement data refresh functionality
6. Add caching if needed

Example service method:
```typescript
getDashboardStats(): Observable<DashboardStats> {
  return this.http.get<DashboardStats>('/api/configuration/dashboard/stats');
}
```

## Color Scheme

- **Primary**: #594ED1 (Purple)
- **Success**: #52C41A (Green)
- **Info**: #1890FF (Blue)
- **Warning**: #FA8C16 (Orange)
- **Error**: #F5222D (Red)
- **Processing**: #13C2C2 (Cyan)

## Module-Specific Dashboard Examples

### Inventory Dashboard Should Show:
- Total stock value
- Low stock alerts
- Items to reorder
- Recent purchase orders
- Warehouse capacity
- Expiring products
- Top moving products
- Inventory turnover rate

### Sales Dashboard Should Show:
- Today's sales
- Monthly revenue
- Top selling products
- Sales by category
- Pending invoices
- Recent transactions
- Sales trends
- Customer statistics

### Reports Module
**Note**: Reports module does NOT have a dashboard as per requirements. It goes directly to report listing/generation pages.

## Best Practices

1. **Performance**: Load only essential data on initial render
2. **User Experience**: Show loading states, handle errors gracefully
3. **Consistency**: Use same card layouts across all dashboards
4. **Accessibility**: Include proper ARIA labels and keyboard navigation
5. **Mobile First**: Design for mobile, enhance for desktop
6. **Data Refresh**: Implement manual or auto-refresh for real-time data
7. **Caching**: Cache dashboard data to reduce API calls
8. **Empty States**: Show helpful messages when no data available

## Testing Checklist

- [ ] Dashboard loads without errors
- [ ] All cards display mock data correctly
- [ ] Quick actions navigate to correct pages
- [ ] Breadcrumbs show correct hierarchy
- [ ] Responsive layout works on all screen sizes
- [ ] Loading states display properly
- [ ] Trend indicators show correct direction
- [ ] Color scheme matches brand colors
- [ ] Navigation from menu works
- [ ] Back navigation works correctly
