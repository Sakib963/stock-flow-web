import { Routes } from '@angular/router';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { unsavedChangesGuard } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { CATEGORY_LIST } from '@app/modules/configuration/category/config/category-list.config';
import { SUB_CATEGORY_LIST } from '@app/modules/configuration/sub-category/config/sub-category-list.config';
import { BRAND_LIST } from '@app/modules/configuration/brand/config/brand-list.config';
import { SUPPLIER_LIST } from '@app/modules/configuration/supplier/config/supplier-list.config';
import { WAREHOUSE_LIST } from '@app/modules/configuration/warehouse/config/warehouse-list.config';
import { AISLE_LIST } from '@app/modules/configuration/aisle/config/aisle-list.config';
import { PRODUCT_LIST } from '@app/modules/configuration/product/config/product-list.config';

/** Everything under /app/configuration. Each URL is the route of its menu item. */
export const CONFIGURATION_ROUTES: Routes = [
    {
        // Loaded with this module rather than at the root, so a screen nobody has opened yet costs
        // nothing. The unsaved-changes guard and the code generator both open a modal.
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
            {
                path: 'products',
                canActivate: [permissionGuard],
                data: { permission: PRODUCT_LIST.permission },
                loadComponent: () => import('./product/pages/product-list/product-list.component').then((m) => m.ProductListComponent),
            },
            {
                path: 'products/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.product.create' },
                loadComponent: () => import('./product/pages/product-create/product-create.component').then((m) => m.ProductCreateComponent),
            },
            {
                path: 'products/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.product.edit' },
                loadComponent: () => import('./product/pages/product-edit/product-edit.component').then((m) => m.ProductEditComponent),
            },
            {
                path: 'products/:oid',
                canActivate: [permissionGuard],
                data: { permission: PRODUCT_LIST.permission },
                loadComponent: () => import('./product/pages/product-detail/product-detail.component').then((m) => m.ProductDetailComponent),
            },
            {
                path: 'categories',
                canActivate: [permissionGuard],
                data: { permission: CATEGORY_LIST.permission },
                loadComponent: () => import('./category/pages/category-list/category-list.component').then((m) => m.CategoryListComponent),
            },
            // Before ':oid', or "new" is read as a category's id and the form tries to load it.
            {
                path: 'categories/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.category.create' },
                loadComponent: () => import('./category/pages/category-create/category-create.component').then((m) => m.CategoryCreateComponent),
            },
            {
                path: 'categories/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.category.edit' },
                loadComponent: () => import('./category/pages/category-edit/category-edit.component').then((m) => m.CategoryEditComponent),
            },
            {
                path: 'categories/:oid',
                canActivate: [permissionGuard],
                data: { permission: CATEGORY_LIST.permission },
                loadComponent: () => import('./category/pages/category-detail/category-detail.component').then((m) => m.CategoryDetailComponent),
            },
            {
                path: 'sub-categories',
                canActivate: [permissionGuard],
                data: { permission: SUB_CATEGORY_LIST.permission },
                loadComponent: () => import('./sub-category/pages/sub-category-list/sub-category-list.component').then((m) => m.SubCategoryListComponent),
            },
            {
                path: 'sub-categories/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.sub-category.create' },
                loadComponent: () => import('./sub-category/pages/sub-category-create/sub-category-create.component').then((m) => m.SubCategoryCreateComponent),
            },
            {
                path: 'sub-categories/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.sub-category.edit' },
                loadComponent: () => import('./sub-category/pages/sub-category-edit/sub-category-edit.component').then((m) => m.SubCategoryEditComponent),
            },
            {
                path: 'sub-categories/:oid',
                canActivate: [permissionGuard],
                data: { permission: SUB_CATEGORY_LIST.permission },
                loadComponent: () => import('./sub-category/pages/sub-category-detail/sub-category-detail.component').then((m) => m.SubCategoryDetailComponent),
            },
            {
                path: 'brands',
                canActivate: [permissionGuard],
                data: { permission: BRAND_LIST.permission },
                loadComponent: () => import('./brand/pages/brand-list/brand-list.component').then((m) => m.BrandListComponent),
            },
            {
                path: 'brands/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.brands.create' },
                loadComponent: () => import('./brand/pages/brand-create/brand-create.component').then((m) => m.BrandCreateComponent),
            },
            {
                path: 'brands/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.brands.edit' },
                loadComponent: () => import('./brand/pages/brand-edit/brand-edit.component').then((m) => m.BrandEditComponent),
            },
            {
                path: 'brands/:oid',
                canActivate: [permissionGuard],
                data: { permission: BRAND_LIST.permission },
                loadComponent: () => import('./brand/pages/brand-detail/brand-detail.component').then((m) => m.BrandDetailComponent),
            },
            {
                path: 'suppliers',
                canActivate: [permissionGuard],
                data: { permission: SUPPLIER_LIST.permission },
                loadComponent: () => import('./supplier/pages/supplier-list/supplier-list.component').then((m) => m.SupplierListComponent),
            },
            {
                path: 'suppliers/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.supplier.create' },
                loadComponent: () => import('./supplier/pages/supplier-create/supplier-create.component').then((m) => m.SupplierCreateComponent),
            },
            {
                path: 'suppliers/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.supplier.edit' },
                loadComponent: () => import('./supplier/pages/supplier-edit/supplier-edit.component').then((m) => m.SupplierEditComponent),
            },
            {
                path: 'suppliers/:oid',
                canActivate: [permissionGuard],
                data: { permission: SUPPLIER_LIST.permission },
                loadComponent: () => import('./supplier/pages/supplier-detail/supplier-detail.component').then((m) => m.SupplierDetailComponent),
            },
            {
                path: 'warehouses',
                canActivate: [permissionGuard],
                data: { permission: WAREHOUSE_LIST.permission },
                loadComponent: () => import('./warehouse/pages/warehouse-list/warehouse-list.component').then((m) => m.WarehouseListComponent),
            },
            {
                path: 'warehouses/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.warehouse.create' },
                loadComponent: () => import('./warehouse/pages/warehouse-create/warehouse-create.component').then((m) => m.WarehouseCreateComponent),
            },
            {
                path: 'warehouses/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.warehouse.edit' },
                loadComponent: () => import('./warehouse/pages/warehouse-edit/warehouse-edit.component').then((m) => m.WarehouseEditComponent),
            },
            {
                path: 'warehouses/:oid',
                canActivate: [permissionGuard],
                data: { permission: WAREHOUSE_LIST.permission },
                loadComponent: () => import('./warehouse/pages/warehouse-detail/warehouse-detail.component').then((m) => m.WarehouseDetailComponent),
            },
            {
                path: 'aisles',
                canActivate: [permissionGuard],
                data: { permission: AISLE_LIST.permission },
                loadComponent: () => import('./aisle/pages/aisle-list/aisle-list.component').then((m) => m.AisleListComponent),
            },
            {
                path: 'aisles/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.aisle.create' },
                loadComponent: () => import('./aisle/pages/aisle-create/aisle-create.component').then((m) => m.AisleCreateComponent),
            },
            {
                path: 'aisles/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.aisle.edit' },
                loadComponent: () => import('./aisle/pages/aisle-edit/aisle-edit.component').then((m) => m.AisleEditComponent),
            },
            {
                path: 'aisles/:oid',
                canActivate: [permissionGuard],
                data: { permission: AISLE_LIST.permission },
                loadComponent: () => import('./aisle/pages/aisle-detail/aisle-detail.component').then((m) => m.AisleDetailComponent),
            },
        ],
    },
];
