# Page Header Component - Usage Guide

## Overview
The Page Header Component is a reusable component that provides a consistent header layout across all pages with support for breadcrumbs, title, description, action buttons, and filter content.

## Location
- **Component**: `src/app/modules/configuration/components/page-header/`
- **Example Usage**: `src/app/modules/configuration/pages/category/category-list/`

## Features
- ✅ Responsive design (description beside title on desktop, under title on mobile)
- ✅ **Automatic breadcrumb resolution via pageKey**
- ✅ Optional manual breadcrumb configuration
- ✅ Optional back button
- ✅ Template support for extra actions (buttons)
- ✅ Template support for content area (filters, search)
- ✅ Ghost mode support
- ✅ Fully integrated with Ng-Zorro

## Breadcrumb System

### Automatic Breadcrumbs (Recommended)

The component uses a centralized breadcrumb configuration file (`breadcrumb.config.ts`) that maps page keys to breadcrumb paths. This eliminates the need to define breadcrumbs in every component.

**Configuration File**: `src/app/modules/configuration/config/breadcrumb.config.ts`

```typescript
export const CONFIGURATION_BREADCRUMBS: BreadcrumbConfig = {
  'category-list': [
    { label: 'Home', url: '/', icon: 'home' },
    { label: 'Configuration', url: '/configuration' },
    { label: 'Category List' }
  ],
  'category-create': [...],
  // Add more page mappings
};
```

### Usage with pageKey (Simple)

```html
<page-header
  [title]="'Category List'"
  [description]="'Manage product categories'"
  [pageKey]="'category-list'">
</page-header>
```

That's it! No need to define breadcrumbs array in your component.

### Manual Breadcrumbs (If needed)

If you need custom breadcrumbs for a specific case, you can still pass them manually:

```typescript
breadcrumbs: Breadcrumb[] = [
  { label: 'Home', url: '/', icon: 'home' },
  { label: 'Custom Path' }
];
```

```html
<page-header
  [title]="'Custom Page'"
  [breadcrumbs]="breadcrumbs">
</page-header>
```

## Basic Usage

### 1. Import the Component

```typescript
import { PageHeaderComponent } from '@app/modules/configuration/components/page-header/page-header.component';

@Component({
  imports: [PageHeaderComponent, ...],
  // ...
})
export class YourComponent {
  // No need to define breadcrumbs!
}
```

### 2. Basic Usage (With Automatic Breadcrumbs)

```html
<page-header
  [title]="'Category List'"
  [description]="'Manage product categories'"
  [pageKey]="'category-list'">
</page-header>
```

### 3. Add Your Page to Breadcrumb Config

Edit `src/app/modules/configuration/config/breadcrumb.config.ts`:

```typescript
export const CONFIGURATION_BREADCRUMBS: BreadcrumbConfig = {
  'your-page-key': [
    { label: 'Home', url: '/', icon: 'home' },
    { label: 'Configuration', url: '/configuration' },
    { label: 'Your Page Title' }
  ],
  // ... other pages
};
```

### 4. With Action Buttons

```html
<page-header
  [title]="'Category List'"
  [description]="'Manage product categories'"
  [pageKey]="'category-list'"
  [extraTemplate]="headerActions">
</page-header>

<ng-template #headerActions>
  <nz-space>
    <primary-button-with-plus-icon 
      *nzSpaceItem
      [label]="'Add New'"
      (click)="handleCreate()">
    </primary-button-with-plus-icon>
  </nz-space>
</ng-template>
```

### 5. With Filters/Search

```html
<page-header
  [title]="'Category List'"
  [description]="'Manage product categories'"
  [pageKey]="'category-list'"
  [contentTemplate]="headerFilters">
</page-header>

<ng-template #headerFilters>
  <div class="mb-4">
    <nz-input-group [nzPrefix]="searchIcon" class="w-full md:w-96">
      <input 
        type="text" 
        nz-input 
        placeholder="Search..." 
        [formControl]="searchControl" 
      />
    </nz-input-group>
    <ng-template #searchIcon>
      <span nz-icon nzType="search"></span>
    </ng-template>
  </div>
</ng-template>
```

### 6. Complete Example (All Features)

```html
<page-header
  [title]="'Category List'"
  [description]="'Manage product categories'"
  [pageKey]="'category-list'"
  [showBackButton]="false"
  [extraTemplate]="headerActions"
  [contentTemplate]="headerFilters">
</page-header>

<ng-template #headerActions>
  <nz-space>
    <button *nzSpaceItem nz-button>Export</button>
    <primary-button-with-plus-icon 
      *nzSpaceItem
      [label]="'Add Category'"
      (click)="handleCreate()">
    </primary-button-with-plus-icon>
  </nz-space>
</ng-template>

<ng-template #headerFilters>
  <div class="space-y-2">
    <nz-input-group [nzPrefix]="searchIcon" class="w-full md:w-96">
      <input type="text" nz-input placeholder="Search..." />
    </nz-input-group>
    <ng-template #searchIcon>
      <span nz-icon nzType="search"></span>
    </ng-template>
  </div>
</ng-template>
```

## Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | `''` | Page title (required) |
| `description` | `string` | `''` | Page description/subtitle |
| `pageKey` | `string` | `undefined` | **Page identifier for auto breadcrumb resolution** |
| `breadcrumbs` | `Breadcrumb[]` | `[]` | Manual breadcrumb array (optional if pageKey used) |
| `showBackButton` | `boolean` | `false` | Show back navigation button |
| `ghost` | `boolean` | `false` | Ghost mode (transparent background) |
| `extraTemplate` | `TemplateRef` | `undefined` | Template for action buttons |
| `contentTemplate` | `TemplateRef` | `undefined` | Template for filters/content |

## Breadcrumb Interface

```typescript
interface Breadcrumb {
  label: string;      // Display text
  url?: string;       // Optional route URL
  icon?: string;      // Optional Ng-Zorro icon name
}
```

## Responsive Behavior

### Desktop (md and above)
- Description appears beside the title as inline text
- Full horizontal layout for actions

### Mobile (below md)
- Description appears under the title as subtitle
- Stacked layout for better mobile UX

## Complete TypeScript Example

```typescript
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PageHeaderComponent } from '@app/modules/configuration/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';

@Component({
  selector: 'app-category-list',
  imports: [PageHeaderComponent, NgZorroCustomModule, ReactiveFormsModule, ...],
  template: `
    <page-header
      [title]="'Category List'"
      [description]="'Manage product categories'"
      [pageKey]="'category-list'"
      [extraTemplate]="actions"
      [contentTemplate]="filters">
    </page-header>
    
    <ng-template #actions>
      <!-- Your action buttons here -->
    </ng-template>
    
    <ng-template #filters>
      <!-- Your filters/search here -->
    </ng-template>
    
    <!-- Rest of your page content -->
  `
})
export class CategoryListComponent implements OnInit {
  searchControl = new FormControl('');
  
  ngOnInit(): void {
    // Component logic
  }
  
  handleCreate(): void {
    // Handle create action
  }
}
```

## Adding New Pages to Breadcrumb Config

When creating a new page, simply add its breadcrumb configuration:

**File**: `src/app/modules/configuration/config/breadcrumb.config.ts`

```typescript
export const CONFIGURATION_BREADCRUMBS: BreadcrumbConfig = {
  // Existing pages...
  'category-list': [...],
  
  // Add your new page
  'product-list': [
    { label: 'Home', url: '/', icon: 'home' },
    { label: 'Configuration', url: '/configuration' },
    { label: 'Product List' }
  ],
  'product-create': [
    { label: 'Home', url: '/', icon: 'home' },
    { label: 'Configuration', url: '/configuration' },
    { label: 'Products', url: '/configuration/product/list' },
    { label: 'Create Product' }
  ],
};
```

## Styling

The component uses:
- Ng-Zorro's `nz-page-header` component
- Tailwind CSS for responsive utilities
- Consistent spacing and typography

## Dependencies

- Angular Common Module
- Angular Router Module
- Ng-Zorro (nz-page-header, nz-breadcrumb)
- Tailwind CSS (for responsive classes)

## Notes

- The `extraTemplate` is perfect for action buttons like "Add New", "Export", etc.
- The `contentTemplate` is ideal for filters, search bars, or any content you want in the header area
- Breadcrumbs without URLs will render as plain text (not clickable)
- The component automatically handles responsive layout changes
