# Hierarchical Breadcrumb Configuration System

## Overview
The breadcrumb system uses a hierarchical, feature-based structure that eliminates repetition through parent-child relationships. Each module defines its features once, and the global registry makes them accessible throughout the application.

## Architecture

```
Core Layer (Global)
├── breadcrumb.registry.ts         # Central registry for all modules
│
Module Layer (Per Module)
├── manager/config/breadcrumb.config.ts
├── admin/config/breadcrumb.config.ts
├── configuration/config/breadcrumb.config.ts
│
Component Layer
└── shared/components/page-header   # Consumes from registry
```

## Benefits
- ✅ **DRY Principle**: Parent breadcrumbs defined once per feature
- ✅ **Hierarchical**: Feature-based organization with parent-child structure
- ✅ **Scalable**: Easy to add new modules and features
- ✅ **Type Safe**: Full TypeScript support
- ✅ **Centralized**: Single source of truth in global registry
- ✅ **Consistent**: Same pattern across all modules

## Configuration Structure

### Feature-Based Configuration

Each feature defines:
1. **Parent breadcrumbs**: Common path to the feature
2. **Page-specific breadcrumbs**: Individual page labels

```typescript
export const CONFIGURATION_BREADCRUMBS: ModuleBreadcrumbConfig = {
  category: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Configuration', url: '/configuration' },
      { label: 'Category', url: '/configuration/category/list' }
    ],
    pages: {
      list: [{ label: 'Category List' }],
      create: [{ label: 'Create Category' }],
      view: [{ label: 'View Category' }],
      edit: [{ label: 'Edit Category' }]
    }
  }
};
```

### Result

- **List page**: `Home > Configuration > Category List`
- **Create page**: `Home > Configuration > Category > Create Category`
- **View page**: `Home > Configuration > Category > View Category`
- **Edit page**: `Home > Configuration > Category > Edit Category`

## Usage in Components

### Simple Usage with pageKey

```typescript
// Component - No breadcrumb definition needed!
export class CategoryListComponent {}
```

```html
<!-- Template -->
<page-header
  [title]="'Category List'"
  [description]="'Manage product categories'"
  [pageKey]="'configuration.category-list'">
</page-header>
```

### Page Key Format

Format: `module.feature-pageType`

Examples:
- `'configuration.category-list'`
- `'configuration.category-create'`
- `'manager.inventory-list'`
- `'admin.user-view'`

## Adding New Features

### Step 1: Add Feature to Module Config

Edit your module's `breadcrumb.config.ts`:

```typescript
// src/app/modules/configuration/config/breadcrumb.config.ts

export const CONFIGURATION_BREADCRUMBS: ModuleBreadcrumbConfig = {
  // Existing features...
  
  // Add new feature
  product: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Configuration', url: '/configuration' },
      { label: 'Product', url: '/configuration/product/list' }
    ],
    pages: {
      list: [{ label: 'Product List' }],
      create: [{ label: 'Create Product' }],
      view: [{ label: 'View Product' }],
      edit: [{ label: 'Edit Product' }],
      pricing: [{ label: 'Product Pricing' }]  // Custom page type
    }
  }
};
```

### Step 2: Use in Component

```html
<page-header
  [title]="'Product List'"
  [pageKey]="'configuration.product-list'">
</page-header>
```

That's it! The parent breadcrumbs are reused automatically.

## Adding New Modules

### Step 1: Create Module Config

Create `src/app/modules/your-module/config/breadcrumb.config.ts`:

```typescript
import { ModuleBreadcrumbConfig } from "@app/modules/configuration/config/breadcrumb.config";

export const YOUR_MODULE_BREADCRUMBS: ModuleBreadcrumbConfig = {
  featureOne: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Your Module', url: '/your-module' },
      { label: 'Feature One', url: '/your-module/feature-one/list' }
    ],
    pages: {
      list: [{ label: 'Feature One List' }],
      create: [{ label: 'Create Feature One' }]
    }
  }
};
```

### Step 2: Register in Global Registry

Edit `src/app/core/config/breadcrumb.registry.ts`:

```typescript
import { YOUR_MODULE_BREADCRUMBS } from "@app/modules/your-module/config/breadcrumb.config";

export const BREADCRUMB_REGISTRY: BreadcrumbRegistry = {
  configuration: CONFIGURATION_BREADCRUMBS,
  manager: MANAGER_BREADCRUMBS,
  admin: ADMIN_BREADCRUMBS,
  yourModule: YOUR_MODULE_BREADCRUMBS,  // Add here
};
```

### Step 3: Use Anywhere

```html
<page-header
  [title]="'Feature One List'"
  [pageKey]="'yourModule.featureOne-list'">
</page-header>
```

## Complete Examples

### Example 1: Configuration Module

```typescript
// File: src/app/modules/configuration/config/breadcrumb.config.ts

export const CONFIGURATION_BREADCRUMBS: ModuleBreadcrumbConfig = {
  category: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Configuration', url: '/configuration' },
      { label: 'Category', url: '/configuration/category/list' }
    ],
    pages: {
      list: [{ label: 'Category List' }],
      create: [{ label: 'Create Category' }],
      view: [{ label: 'View Category' }],
      edit: [{ label: 'Edit Category' }]
    }
  },
  
  product: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Configuration', url: '/configuration' },
      { label: 'Product', url: '/configuration/product/list' }
    ],
    pages: {
      list: [{ label: 'Product List' }],
      create: [{ label: 'Create Product' }],
      view: [{ label: 'View Product' }],
      edit: [{ label: 'Edit Product' }],
      pricing: [{ label: 'Update Pricing' }]
    }
  }
};
```

Usage:
```html
<!-- Category List -->
<page-header [title]="'Category List'" [pageKey]="'configuration.category-list'"></page-header>
<!-- Result: Home > Configuration > Category List -->

<!-- Create Category -->
<page-header [title]="'Create Category'" [pageKey]="'configuration.category-create'"></page-header>
<!-- Result: Home > Configuration > Category > Create Category -->

<!-- Product Pricing -->
<page-header [title]="'Update Pricing'" [pageKey]="'configuration.product-pricing'"></page-header>
<!-- Result: Home > Configuration > Product > Update Pricing -->
```

### Example 2: Manager Module

```typescript
// File: src/app/modules/manager/config/breadcrumb.config.ts

export const MANAGER_BREADCRUMBS: ModuleBreadcrumbConfig = {
  inventory: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Manager', url: '/manager' },
      { label: 'Inventory', url: '/manager/inventory/list' }
    ],
    pages: {
      list: [{ label: 'Inventory List' }],
      overview: [{ label: 'Inventory Overview' }],
      lowStock: [{ label: 'Low Stock Items' }],
      purchaseOrder: [{ label: 'Purchase Orders' }]
    }
  }
};
```

Usage:
```html
<page-header [title]="'Low Stock Items'" [pageKey]="'manager.inventory-lowStock'"></page-header>
<!-- Result: Home > Manager > Inventory > Low Stock Items -->
```

## Custom Page Types

You can define custom page types beyond the standard list/create/view/edit:

```typescript
dashboard: {
  parent: [
    { label: 'Home', url: '/', icon: 'home' },
    { label: 'Manager' }
  ],
  pages: {
    main: [{ label: 'Dashboard' }],
    analytics: [{ label: 'Analytics Dashboard' }],
    sales: [{ label: 'Sales Dashboard' }],
    inventory: [{ label: 'Inventory Dashboard' }]
  }
}
```

Usage:
```html
<page-header [title]="'Sales Dashboard'" [pageKey]="'manager.dashboard-sales'"></page-header>
```

## Dynamic Breadcrumbs

For pages that need dynamic content (e.g., item names), use manual breadcrumbs:

```typescript
export class CategoryDetailsComponent implements OnInit {
  breadcrumbs: Breadcrumb[] = [];

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.categoryService.get(id).subscribe(category => {
      this.breadcrumbs = [
        { label: 'Home', url: '/', icon: 'home' },
        { label: 'Configuration', url: '/configuration' },
        { label: 'Categories', url: '/configuration/category/list' },
        { label: category.name } // Dynamic name
      ];
    });
  }
}
```

```html
<page-header 
  [title]="categoryName"
  [breadcrumbs]="breadcrumbs">
</page-header>
```

## Comparison: Before vs After

### Before (Repetitive) ❌

```typescript
// Every single page had to define full breadcrumb arrays
'category-list': [
  { label: 'Home', url: '/', icon: 'home' },
  { label: 'Configuration', url: '/configuration' },
  { label: 'Category List' }
],
'category-create': [
  { label: 'Home', url: '/', icon: 'home' },    // Repeated
  { label: 'Configuration', url: '/configuration' },  // Repeated
  { label: 'Category', url: '/configuration/category/list' },
  { label: 'Create Category' }
],
'category-view': [
  { label: 'Home', url: '/', icon: 'home' },    // Repeated
  { label: 'Configuration', url: '/configuration' },  // Repeated
  { label: 'Category', url: '/configuration/category/list' },  // Repeated
  { label: 'View Category' }
]
```

### After (DRY) ✅

```typescript
// Define parent once, reuse for all pages
category: {
  parent: [
    { label: 'Home', url: '/', icon: 'home' },
    { label: 'Configuration', url: '/configuration' },
    { label: 'Category', url: '/configuration/category/list' }
  ],
  pages: {
    list: [{ label: 'Category List' }],
    create: [{ label: 'Create Category' }],
    view: [{ label: 'View Category' }]
  }
}
```

```typescript
interface Breadcrumb {
  label: string;      // Display text
  url?: string;       // Optional route URL (clickable if provided)
  icon?: string;      // Optional Ng-Zorro icon name
}
```

## Page Key Naming Convention

Use kebab-case and follow this pattern:
- List pages: `{entity}-list` (e.g., `category-list`, `product-list`)
- Create pages: `{entity}-create` (e.g., `category-create`)
- View pages: `{entity}-view` (e.g., `category-view`)
- Edit pages: `{entity}-edit` (e.g., `category-edit`)

## Manual Breadcrumbs (Edge Cases)

If you need dynamic breadcrumbs (e.g., with item names), you can still pass them manually:

```typescript
export class CategoryDetailsComponent {
  breadcrumbs: Breadcrumb[] = [];

  loadCategory(id: string): void {
    this.categoryService.get(id).subscribe(category => {
      this.breadcrumbs = [
        { label: 'Home', url: '/', icon: 'home' },
        { label: 'Configuration', url: '/configuration' },
        { label: 'Categories', url: '/configuration/category/list' },
        { label: category.name } // Dynamic category name
      ];
    });
  }
}
```

```html
<page-header
  [title]="categoryName"
  [breadcrumbs]="breadcrumbs">
</page-header>
```

## How It Works

1. Component passes `pageKey` to `page-header`
2. `page-header` calls `getBreadcrumbs(pageKey)` on init
3. Function looks up breadcrumbs from `CONFIGURATION_BREADCRUMBS`
4. Breadcrumbs are rendered automatically

## Best Practices

1. **Use pageKey for static breadcrumbs**: Most list/create pages have fixed breadcrumb paths
2. **Use manual breadcrumbs for dynamic content**: Detail pages that need item names
3. **Keep URLs consistent**: Use the same URL pattern across breadcrumbs
4. **Add icons to home breadcrumb**: Makes it visually distinct
5. **Don't make last breadcrumb clickable**: It represents the current page

## Example: Complete Page Implementation

```typescript
import { Component, OnInit } from '@angular/core';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';

@Component({
  selector: 'category-list',
  imports: [PageHeaderComponent, ...],
  template: `
    <page-header
      [title]="'Category List'"
      [description]="'Manage product categories'"
      [pageKey]="'category-list'"
      [extraTemplate]="actions"
      [contentTemplate]="filters">
    </page-header>
    
    <!-- Templates and content -->
  `
})
export class CategoryListComponent implements OnInit {
  ngOnInit(): void {
    // Component logic - no breadcrumb setup needed!
  }
}
```

## Migration Guide

To migrate existing pages:

1. Add page mapping to `breadcrumb.config.ts`
2. Remove `Breadcrumb` import from component
3. Remove `breadcrumbs` property from component
4. Replace `[breadcrumbs]="breadcrumbs"` with `[pageKey]="'your-page-key'"`

That's it! The breadcrumb system handles the rest automatically.
