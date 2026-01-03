# Configuration Dashboard Component

## Overview
The Configuration Dashboard provides a comprehensive overview of all configuration-related data in the system. It displays statistics, insights, quick actions, and recent activities for Categories, Sub-Categories, Brands, Suppliers, Products, Warehouses, and Aisles.

## Features

### 1. Statistics Cards (8 Cards)
Displays key metrics with trend indicators:
- **Active Categories**: Total categories with status = 'Active'
- **Sub Categories**: Total sub-categories
- **Active Brands**: Total brands with status = 'Active'
- **Active Suppliers**: Total suppliers with status = 'Active'
- **Active Products**: Total products with status = 'Active' AND is_deleted = false
- **Warehouses**: Total warehouses with status = 'Active'
- **Aisles/Zones**: Total aisles/zones with status = 'Active'
- **Total SKUs**: Count of distinct product SKUs

### 2. Quick Actions (7 Buttons)
Direct links to create new configuration items:
- Add Category
- Add Sub Category
- Add Brand
- Add Supplier
- Add Product
- Add Warehouse
- Add Aisle/Zone

### 3. Charts & Visualizations

#### Category Distribution Chart
- Shows product distribution across different categories
- Bar chart visualization
- Helps identify most popular product categories

#### Top Suppliers by Product Count
- Lists top suppliers ranked by number of products
- Progress bar visualization
- Helps identify key supplier relationships

### 4. Recent Activities Timeline
- Displays last 10 configuration-related activities
- Shows who performed the action and when
- Activity types: create, update, delete
- Icons color-coded by activity type

### 5. Data Quality Health
- Monitors configuration data completeness
- Tracks:
  - Products with complete information
  - Products missing critical data
  - Suppliers pending verification
- Visual health indicators with percentages

### 6. Configuration Insights
Dynamic calculations providing business intelligence:
- **Avg. Products per Category**: 487 products / 46 categories = 10.6
- **Avg. Sub-Categories per Category**: 148 sub-categories / 46 categories = 3.2
- **Products per Supplier**: 487 products / 31 suppliers = 15.7

### 7. Most Productive Categories
Top 4 categories ranked by:
- Number of products
- Number of sub-categories
- Percentage of total products

### 8. Warehouse & Storage Insights
- Active Warehouses count
- Total Aisles/Zones
- Average aisles per warehouse
- Products per warehouse distribution

### 9. Brand Performance
- Active Brands count
- Average products per brand
- Brands with 10+ products
- Brand distribution analysis

### 10. Status Overview
- Active Items count (ready for use)
- Inactive Items count (temporarily disabled)
- Items Needing Attention (missing data/incomplete)

## Database Schema Integration

The dashboard is fully aligned with the database schema:

```sql
-- Categories
SELECT COUNT(*) FROM categories WHERE status = 'Active'

-- Sub-Categories
SELECT COUNT(*) FROM sub_categories WHERE status = 'Active'

-- Brands
SELECT COUNT(*) FROM brands WHERE status = 'Active'

-- Suppliers
SELECT COUNT(*) FROM supplier WHERE status = 'Active'

-- Products (Active & Not Deleted)
SELECT COUNT(*) FROM product WHERE status = 'Active' AND is_deleted = false

-- Warehouses
SELECT COUNT(*) FROM warehouse WHERE status = 'Active'

-- Aisles
SELECT COUNT(*) FROM aisle WHERE status = 'Active'

-- Total SKUs
SELECT COUNT(DISTINCT sku) FROM product
```

## Activity Tracking

Activities are tracked using feature-based tables. See [activity-log-schema.sql](./activity-log-schema.sql) for the complete schema.

### Configuration Activities Table
```sql
CREATE TABLE configuration_activities (
    oid BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    activity_type VARCHAR(50) NOT NULL,
    feature_name VARCHAR(50) NOT NULL,
    record_id BIGINT,
    created_by BIGINT NOT NULL REFERENCES login(oid),
    created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Activity Types
- `category_created`, `category_updated`, `category_deleted`
- `product_created`, `product_updated`, `product_deleted`
- `supplier_created`, `supplier_updated`, `supplier_deactivated`
- `brand_created`, `brand_updated`, `brand_deleted`
- `warehouse_created`, `warehouse_updated`, `warehouse_deleted`
- `aisle_created`, `aisle_updated`, `aisle_deleted`

### Feature Names
- `categories`, `sub_categories`, `brands`, `suppliers`, `products`, `warehouses`, `aisles`

## API Integration (TODO)

Replace mock data with actual API calls:

### Required Endpoints

#### 1. Statistics Endpoint
```typescript
GET /api/configuration/statistics
Response: {
  categories: number,
  subCategories: number,
  brands: number,
  suppliers: number,
  products: number,
  warehouses: number,
  aisles: number,
  totalSKUs: number
}
```

#### 2. Charts Endpoints
```typescript
// Category Distribution
GET /api/configuration/charts/category-distribution
Response: Array<{ name: string, value: number }>

// Top Suppliers
GET /api/configuration/charts/top-suppliers
Response: Array<{ name: string, value: number }>
```

#### 3. Activities Endpoint
```typescript
GET /api/configuration/activities?limit=10
Response: Array<{
  title: string,
  description: string,
  time: string,        // e.g., "5 minutes ago"
  icon: string,        // e.g., "check-circle"
  type: string,        // "create" | "update" | "delete"
  created_by: string   // User name
}>
```

#### 4. Data Quality Endpoint
```typescript
GET /api/configuration/data-quality
Response: {
  completeProducts: number,
  missingImages: number,
  missingBrands: number,
  pendingSuppliers: number,
  totalIssues: number
}
```

## Component Structure

### Files
- `configuration-dashboard.component.ts` - Component logic
- `configuration-dashboard.component.html` - Template
- `configuration-dashboard.component.scss` - Styles
- `activity-log-schema.sql` - Database schema for activity tracking
- `README.md` - This documentation

### Key Methods

#### `ngOnInit()`
Initializes all dashboard data on component load.

#### `loadStatCards()`
Loads the 8 statistics cards. Replace with API call to `/api/configuration/statistics`.

#### `loadQuickActions()`
Loads the 7 quick action buttons. Static data.

#### `loadRecentActivities()`
Loads the 10 most recent activities. Replace with API call to `/api/configuration/activities`.

#### `loadChartData()`
Loads category distribution and supplier charts. Replace with API calls to chart endpoints.

#### `getActivityIconColor(type)`
Returns icon color class based on activity type (create/update/delete).

#### `getPercentage(value, total)`
Calculates percentage for progress bars.

## Responsive Design

### Desktop (lg+)
- 4-column grid for statistics cards
- 7-column grid for quick actions
- 2-column layout for charts
- 3-column layout for insights

### Tablet (md)
- 3-column grid for statistics cards
- 3-column grid for quick actions
- 2-column layout maintained

### Mobile (sm)
- 1-column grid for statistics cards
- 2-column grid for quick actions
- Stacked layout for all sections

## Color Scheme

### Primary Colors
- Primary: `#594ED1` (Purple)
- Success: `#52C41A` (Green)
- Warning: `#FA8C16` (Orange)
- Error: `#F5222D` (Red)
- Info: `#1890FF` (Blue)

### Card Colors
Each stat card has a unique color for visual distinction:
- Categories: Purple `#594ED1`
- Sub-Categories: Light Purple `#7E75E5`
- Brands: Green `#52C41A`
- Suppliers: Blue `#1890FF`
- Products: Orange `#FA8C16`
- Warehouses: Cyan `#13C2C2`
- Aisles: Pink `#EB2F96`
- Total SKUs: Violet `#722ED1`

## Future Enhancements

### Phase 2
- [ ] Real-time updates using WebSockets
- [ ] Customizable dashboard layout (drag & drop)
- [ ] Export dashboard data as PDF/Excel
- [ ] Date range filters for statistics
- [ ] Comparison with previous period

### Phase 3
- [ ] Predictive analytics for inventory
- [ ] Automated alerts for data quality issues
- [ ] Advanced filtering and search
- [ ] Customizable KPIs per user role
- [ ] Dashboard templates for different roles

## Usage Example

```typescript
import { ConfigurationDashboardComponent } from './pages/configuration-dashboard/configuration-dashboard.component';

// In routing module
{
  path: 'stats',
  component: ConfigurationDashboardComponent,
  data: { breadcrumb: 'Stats' }
}
```

## Dependencies
- Angular 18+
- Ng-Zorro UI Components
- Tailwind CSS
- RouterModule

## Notes
- All statistics count only active records (status = 'Active')
- Products additionally filter by is_deleted = false
- Activities are sorted by created_on DESC
- Mock data is provided for development and will be replaced with API calls
- SQL schema for activity logs is available in the same folder
