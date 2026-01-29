import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'stats',
        pathMatch: 'full',
    },
    {
        path: 'stats',
        loadComponent: () => import('./pages/configuration-dashboard/configuration-dashboard.component').then((m) => m.ConfigurationDashboardComponent),
    },
    {
        path: 'alerts',
        loadComponent: () => import('./pages/alerts/alerts.component').then((m) => m.AlertsComponent),
    },
    {
        path: 'analytics',
        loadComponent: () => import('./pages/analytics/analytics.component').then((m) => m.AnalyticsComponent),
    },
    {
        path: 'category',
        children: [
            {
                path: '',
                redirectTo: 'list',
                pathMatch: 'full',
            },
            {
                path: 'create',
                loadComponent: () => import('./pages/category/create-category/create-category.component').then((m) => m.CreateCategoryComponent),
            },
            {
                path: 'view/:oid',
                loadComponent: () => import('./pages/category/view-category-details/view-category-details.component').then((m) => m.ViewCategoryDetailsComponent),
            },
            {
                path: 'list',
                loadComponent: () => import('./pages/category/category-list/category-list.component').then((m) => m.CategoryListComponent),
            },
        ],
    },
    {
        path: 'sub-category',
        children: [
            {
                path: '',
                redirectTo: 'list',
                pathMatch: 'full',
            },
            {
                path: 'create',
                loadComponent: () => import('./pages/sub-category/create-sub-category/create-sub-category.component').then((m) => m.CreateSubCategoryComponent),
            },
            {
                path: 'view/:oid',
                loadComponent: () => import('./pages/sub-category/view-sub-category-details/view-sub-category-details.component').then((m) => m.ViewSubCategoryDetailsComponent),
            },
            {
                path: 'list',
                loadComponent: () => import('./pages/sub-category/sub-category-list/sub-category-list.component').then((m) => m.SubCategoryListComponent),
            },
        ],
    },
    {
        path: 'brands',
        children: [
            {
                path: '',
                redirectTo: 'list',
                pathMatch: 'full',
            },
            {
                path: 'create',
                loadComponent: () => import('./pages/brands/create-brand/create-brand.component').then((m) => m.CreateBrandComponent),
            },
            {
                path: 'view/:oid',
                loadComponent: () => import('./pages/brands/view-brand-details/view-brand-details.component').then((m) => m.ViewBrandDetailsComponent),
            },
            {
                path: 'list',
                loadComponent: () => import('./pages/brands/brand-list/brand-list.component').then((m) => m.BrandListComponent),
            },
        ],
    },
    {
        path: 'supplier',
        children: [
            {
                path: '',
                redirectTo: 'list',
                pathMatch: 'full',
            },
            {
                path: 'create',
                loadComponent: () => import('./pages/supplier/create-supplier/create-supplier.component').then((m) => m.CreateSupplierComponent),
            },
            {
                path: 'view/:oid',
                loadComponent: () => import('./pages/supplier/view-supplier-details/view-supplier-details.component').then((m) => m.ViewSupplierDetailsComponent),
            },
            {
                path: 'list',
                loadComponent: () => import('./pages/supplier/supplier-list/supplier-list.component').then((m) => m.SupplierListComponent),
            },
        ],
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class ConfigurationRoutingModule {}
