import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManagerComponent } from './manager.component';
import { NotFoundComponent } from '@app/shared/components/not-found/not-found.component';

const routes: Routes = [
  {
    path: '',
    component: ManagerComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/manager-dashboard/manager-dashboard.component').then(
            (m) => m.ManagerDashboardComponent
          ),
      },
      {
        path: 'configuration',
        children: [
          {
            path: 'category',
            children: [
              {
                path: '',
                redirectTo: 'category-list',
                pathMatch: 'full',
              },
              {
                path: 'category-list',
                loadComponent: () =>
                  import(
                    './pages/configuration/category/display-category-list/display-category-list.component'
                  ).then((m) => m.DisplayCategoryListComponent),
              },
              {
                path: 'create-category',
                loadComponent: () =>
                  import(
                    './pages/configuration/category/create-category/create-category.component'
                  ).then((m) => m.CreateCategoryComponent),
              },
              {
                path: 'view-category/:oid',
                loadComponent: () =>
                  import(
                    './pages/configuration/category/view-category-details/view-category-details.component'
                  ).then((m) => m.ViewCategoryDetailsComponent),
              },
            ],
          },
          {
            path: 'sub-category',
            children: [
              {
                path: '',
                redirectTo: 'sub-category-list',
                pathMatch: 'full',
              },
              {
                path: 'sub-category-list',
                loadComponent: () =>
                  import(
                    './pages/configuration/sub-category/display-sub-category-list/display-sub-category-list.component'
                  ).then((m) => m.DisplaySubCategoryListComponent),
              },
              {
                path: 'create-sub-category',
                loadComponent: () =>
                  import(
                    './pages/configuration/sub-category/create-sub-category/create-sub-category.component'
                  ).then((m) => m.CreateSubCategoryComponent),
              },
              {
                path: 'view-sub-category/:oid',
                loadComponent: () =>
                  import(
                    './pages/configuration/sub-category/view-sub-category-details/view-sub-category-details.component'
                  ).then((m) => m.ViewSubCategoryDetailsComponent),
              },
            ],
          },
          {
            path: 'supplier',
            children: [
              {
                path: '',
                redirectTo: 'supplier-list',
                pathMatch: 'full',
              },
              {
                path: 'supplier-list',
                loadComponent: () =>
                  import(
                    './pages/configuration/supplier/display-supplier-list/display-supplier-list.component'
                  ).then((m) => m.DisplaySupplierListComponent),
              },
              {
                path: 'create-supplier',
                loadComponent: () =>
                  import(
                    './pages/configuration/supplier/create-supplier/create-supplier.component'
                  ).then((m) => m.CreateSupplierComponent),
              },
              {
                path: 'view-supplier/:oid',
                loadComponent: () =>
                  import(
                    './pages/configuration/supplier/view-supplier-details/view-supplier-details.component'
                  ).then((m) => m.ViewSupplierDetailsComponent),
              },
            ],
          },
          {
            path: 'product',
            children: [
              {
                path: '',
                redirectTo: 'product-list',
                pathMatch: 'full',
              },
              {
                path: 'product-list',
                loadComponent: () =>
                  import(
                    './pages/configuration/product/display-product-list/display-product-list.component'
                  ).then((m) => m.DisplayProductListComponent),
              },
              {
                path: 'create-product',
                loadComponent: () =>
                  import(
                    './pages/configuration/product/create-product/create-product.component'
                  ).then((m) => m.CreateProductComponent),
              },
              {
                path: 'view-product/:oid',
                loadComponent: () =>
                  import(
                    './pages/configuration/product/view-product-details/view-product-details.component'
                  ).then((m) => m.ViewProductDetailsComponent),
              },
            ],
          },
          {
            path: 'warehouse',
            children: [
              {
                path: '',
                redirectTo: 'warehouse-list',
                pathMatch: 'full',
              },
              {
                path: 'warehouse-list',
                loadComponent: () =>
                  import(
                    './pages/configuration/warehouse/display-warehouse-list/display-warehouse-list.component'
                  ).then((m) => m.DisplayWarehouseListComponent),
              },
              {
                path: 'create-warehouse',
                loadComponent: () =>
                  import(
                    './pages/configuration/warehouse/create-warehouse/create-warehouse.component'
                  ).then((m) => m.CreateWarehouseComponent),
              },
              {
                path: 'view-warehouse/:oid',
                loadComponent: () =>
                  import(
                    './pages/configuration/warehouse/view-warehouse-details/view-warehouse-details.component'
                  ).then((m) => m.ViewWarehouseDetailsComponent),
              },
            ],
          },
        ],
      },
      {
        path: 'inventory',
        children: [
          {
            path: '',
            redirectTo: 'overview',
            pathMatch: 'full',
          },
          {
            path: 'overview',
            loadComponent: () =>
              import(
                './pages/inventory/inventory-overview/inventory-overview.component'
              ).then((m) => m.InventoryOverviewComponent),
          },
          {
            path: 'purchase',
            children: [
              {
                path: '',
                redirectTo: 'purchase-list',
                pathMatch: 'full',
              },
              {
                path: 'purchase-list',
                loadComponent: () =>
                  import(
                    './pages/inventory/purchase-products/product-purchase-list/product-purchase-list.component'
                  ).then((m) => m.ProductPurchaseListComponent),
              },
            ],
          },
          {
            path: 'dispatch',
            loadComponent: () =>
              import(
                './pages/inventory/dispatch-products/dispatch-products.component'
              ).then((m) => m.DispatchProductsComponent),
          },
        ],
      },
    ],
  },
  {
    path: 'not-found',
    component: NotFoundComponent,
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManagerRoutingModule {}
