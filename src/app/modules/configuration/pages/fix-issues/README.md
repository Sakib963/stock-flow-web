# Fix Issues Component - Data Quality Management

## Overview
The Fix Issues page is a comprehensive data quality management interface that helps identify and resolve configuration-related data issues across the system. It provides actionable insights and direct links to fix problems.

## Purpose
- **Identify Data Quality Problems**: Surface incomplete or inconsistent configuration data
- **Prioritize Issues**: Categorize by severity (Critical, High, Medium, Low)
- **Enable Quick Fixes**: Direct navigation to edit pages for immediate resolution
- **Bulk Operations**: Provide bulk fix capabilities for common issues
- **Export & Report**: Generate reports of data quality issues

## Issue Categories

### 1. Products Missing Images (High Priority)
**Impact**: Poor customer experience, reduced sales conversion
**Query**: `SELECT * FROM product WHERE (image_url IS NULL OR image_url = '') AND status = 'Active' AND is_deleted = false`
**Fix**: Upload product images through product edit page
**Bulk Fix**: Upload multiple images via CSV import

### 2. Products Without Brands (High Priority)
**Impact**: Poor product categorization, difficult inventory management
**Query**: `SELECT * FROM product WHERE brand_oid IS NULL AND status = 'Active' AND is_deleted = false`
**Fix**: Assign brand through product edit page
**Bulk Fix**: Use CSV import to assign brands in bulk

### 3. Products Without Categories (Critical Priority)
**Impact**: Products can't be found by customers, inventory chaos
**Query**: `SELECT * FROM product WHERE category_oid IS NULL AND status = 'Active' AND is_deleted = false`
**Fix**: Assign category through product edit page (required field)
**Bulk Fix**: Auto-categorize based on product name/description

### 4. Products Without Suppliers (High Priority)
**Impact**: Can't track product sources, purchasing problems
**Query**: `SELECT * FROM product WHERE supplier_oid IS NULL AND status = 'Active' AND is_deleted = false`
**Fix**: Assign supplier through product edit page
**Bulk Fix**: Bulk assign default supplier or import supplier mapping

### 5. Empty Categories (Low Priority)
**Impact**: Clutters category list, confuses navigation
**Query**: `SELECT c.* FROM categories c WHERE NOT EXISTS (SELECT 1 FROM product p WHERE p.category_oid = c.oid AND p.status = 'Active' AND p.is_deleted = false) AND c.status = 'Active'`
**Fix Options**:
- Add products to the category
- Mark category as inactive
- Delete category if no longer needed
**Bulk Fix**: Deactivate all empty categories at once

### 6. Empty Brands (Low Priority)
**Impact**: Clutters brand list, maintenance overhead
**Query**: `SELECT b.* FROM brands b WHERE NOT EXISTS (SELECT 1 FROM product p WHERE p.brand_oid = b.oid AND p.status = 'Active' AND p.is_deleted = false) AND b.status = 'Active'`
**Fix Options**:
- Add products to the brand
- Mark brand as inactive
- Delete brand if obsolete
**Bulk Fix**: Deactivate all empty brands

### 7. Inactive Suppliers (Medium Priority)
**Impact**: May have active products, purchasing confusion
**Query**: `SELECT * FROM supplier WHERE status = 'Inactive'`
**Fix Options**:
- Reactivate supplier if still in business
- Reassign products to active supplier
- Keep inactive for historical tracking
**Bulk Fix**: Reassign all products from inactive suppliers to active alternatives

## Features

### Summary Dashboard
- **Total Issues Count**: Aggregate of all data quality issues
- **Critical Issues**: Issues requiring immediate attention
- **High Priority Issues**: Issues to be addressed within 24 hours
- Color-coded severity indicators

### Filtering System
- **All Issues View**: Shows everything
- **Category-specific Views**: Filter by issue type
- Tab-based navigation for easy switching
- Real-time count updates

### Issue Table
Displays for each issue:
- **Identification**: SKU, Product/Category/Brand name
- **Context**: Related entities (category, brand for products)
- **Issue Description**: Clear explanation of the problem
- **Priority Badge**: Visual priority indicator
- **Action Button**: Direct "Fix Now" link to edit page

### Bulk Operations
For categories with multiple issues:
- **Bulk Fix Button**: Process multiple items simultaneously
- **Batch Updates**: Apply same fix to similar issues
- **CSV Export**: Generate spreadsheet for offline review

### Help Section
- **Why Fix Issues**: Explains business impact
- **Priority Guide**: Severity definitions and timelines
- **Bulk Operations Guide**: How to use batch features

## SQL Queries

See [dashboard-queries.sql](../configuration-dashboard/dashboard-queries.sql) Section 11 for all queries.

### Key Queries

#### Get All Data Quality Issues Summary
```sql
SELECT 
    (SELECT COUNT(*) FROM product WHERE (image_url IS NULL OR image_url = '') AND status = 'Active' AND is_deleted = false) as missing_images,
    (SELECT COUNT(*) FROM product WHERE brand_oid IS NULL AND status = 'Active' AND is_deleted = false) as missing_brands,
    (SELECT COUNT(*) FROM product WHERE category_oid IS NULL AND status = 'Active' AND is_deleted = false) as missing_categories,
    (SELECT COUNT(*) FROM product WHERE supplier_oid IS NULL AND status = 'Active' AND is_deleted = false) as missing_suppliers,
    (SELECT COUNT(*) FROM categories c WHERE NOT EXISTS (SELECT 1 FROM product p WHERE p.category_oid = c.oid AND p.status = 'Active' AND p.is_deleted = false) AND c.status = 'Active') as empty_categories,
    (SELECT COUNT(*) FROM brands b WHERE NOT EXISTS (SELECT 1 FROM product p WHERE p.brand_oid = b.oid AND p.status = 'Active' AND p.is_deleted = false) AND b.status = 'Active') as empty_brands,
    (SELECT COUNT(*) FROM supplier WHERE status = 'Inactive') as inactive_suppliers;
```

## API Integration

### Required Endpoints

#### 1. Get All Issues Summary
```typescript
GET /api/configuration/data-quality/summary
Response: {
  totalIssues: number,
  criticalIssues: number,
  highIssues: number,
  mediumIssues: number,
  lowIssues: number,
  categories: Array<{
    type: string,
    label: string,
    count: number,
    priority: string
  }>
}
```

#### 2. Get Issues by Category
```typescript
GET /api/configuration/data-quality/issues?type=missing_images
Response: Array<{
  oid: number,
  sku?: string,
  name: string,
  category?: string,
  brand?: string,
  issueType: string,
  priority: string,
  description: string,
  actionUrl: string
}>
```

#### 3. Bulk Fix Endpoint
```typescript
POST /api/configuration/data-quality/bulk-fix
Request: {
  issueType: string,
  action: 'deactivate' | 'delete' | 'assign' | 'update',
  affectedIds: number[],
  payload?: any  // Additional data for fix (e.g., new brand_oid)
}
Response: {
  success: boolean,
  fixedCount: number,
  failedCount: number,
  errors?: string[]
}
```

#### 4. Export Issues
```typescript
GET /api/configuration/data-quality/export?format=csv
Response: CSV file download with all issues
```

## User Workflow

### Fixing Individual Issues
1. User navigates to Fix Issues page from dashboard alert
2. Reviews summary cards showing total/critical/high priority counts
3. Filters by specific issue category (e.g., "Products Missing Images")
4. Reviews table showing affected products with context
5. Clicks "Fix Now" button next to specific issue
6. Redirects to product edit page with issue highlighted
7. User completes missing data and saves
8. Returns to Fix Issues page (issue automatically removed on next load)

### Bulk Fixing Issues
1. User identifies category with many issues (e.g., 24 missing images)
2. Clicks "Bulk Fix" button
3. Modal opens with bulk operation options:
   - For missing images: Upload CSV with SKU to image URL mapping
   - For empty categories: Bulk deactivate option
   - For missing suppliers: Select default supplier to assign
4. User completes bulk operation
5. Success message with count of fixed items
6. Table refreshes showing remaining issues

## Priority Definitions

| Priority | Timeline | Business Impact | Examples |
|----------|----------|----------------|----------|
| **Critical** | Fix immediately | System malfunction, data corruption | Missing categories (products unfindable) |
| **High** | Fix within 24h | Poor user experience, reduced sales | Missing images, missing brands |
| **Medium** | Fix within 1 week | Operational inefficiency | Inactive suppliers with active products |
| **Low** | Fix when convenient | Minimal impact, cleanup | Empty categories, empty brands |

## Responsive Design
- **Desktop**: Multi-column table layout, all columns visible
- **Tablet**: Condensed table, scrollable horizontally
- **Mobile**: Card-based layout for each issue, stacked vertically

## Future Enhancements

### Phase 2
- [ ] Automated issue detection (scheduled background job)
- [ ] Email notifications for critical issues
- [ ] Issue resolution history/audit log
- [ ] AI-powered auto-fix suggestions
- [ ] Bulk image upload with drag & drop
- [ ] Integration with DAM (Digital Asset Management) for images

### Phase 3
- [ ] Predictive analytics (identify potential issues before they occur)
- [ ] Custom issue rules/validators
- [ ] Workflow automation (auto-fix low-priority issues)
- [ ] Dashboard widgets showing issue trends over time
- [ ] Integration with external data quality tools

## Best Practices

### For Administrators
1. **Review Daily**: Check Fix Issues page at start of each day
2. **Prioritize Critical**: Address critical issues immediately
3. **Batch Processing**: Use bulk operations for efficiency
4. **Document Patterns**: If same issues repeat, improve data entry validation
5. **Regular Cleanup**: Schedule monthly reviews of low-priority issues

### For Developers
1. **Prevent at Source**: Add validation to prevent issues during data entry
2. **Required Fields**: Make critical fields (category, brand) required
3. **Default Values**: Provide sensible defaults where appropriate
4. **Import Validation**: Validate bulk imports before accepting
5. **User Education**: Provide helpful error messages and tooltips

## Testing Checklist
- [ ] All issue categories display correct counts
- [ ] Filtering works for each category
- [ ] "Fix Now" buttons navigate to correct edit pages
- [ ] Bulk fix buttons trigger appropriate modals/actions
- [ ] Export generates valid CSV file
- [ ] Priority badges display correct colors
- [ ] Responsive layout works on mobile/tablet
- [ ] Loading states work properly
- [ ] Empty states display when no issues exist
- [ ] Help section is informative and accurate

## File Structure
```
src/app/modules/configuration/pages/fix-issues/
├── fix-issues.component.ts       (Component logic, 330 lines)
├── fix-issues.component.html     (Template with filtering & tables)
├── fix-issues.component.scss     (Styles - using Tailwind)
└── README.md                     (This documentation)
```

## Dependencies
- Angular 18+
- Ng-Zorro UI Components (Table, Card, Tag, Badge, Button)
- Tailwind CSS
- RouterModule (for navigation)

## Related Documentation
- [Configuration Dashboard](../configuration-dashboard/README.md)
- [Dashboard Queries](../configuration-dashboard/dashboard-queries.sql)
- [Activity Log Schema](../configuration-dashboard/activity-log-schema.sql)

---

**Status**: ✅ Frontend Complete (API Integration Pending)
**Route**: `/configuration/fix-issues`
**Breadcrumb**: Configuration → Fix Issues
