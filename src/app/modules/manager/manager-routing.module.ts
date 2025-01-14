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
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/manager-dashboard/manager-dashboard.component').then(
            (m) => m.ManagerDashboardComponent
          ),
      },
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
        path: 'supplier-dealer',
        children: [
          {
            path: '',
            redirectTo: 'supplier-dealer-list',
            pathMatch: 'full',
          },
          {
            path: 'supplier-dealer-list',
            loadComponent: () =>
              import(
                './pages/configuration/supplier-dealer/display-supplier-dealer-list/display-supplier-dealer-list.component'
              ).then((m) => m.DisplaySupplierDealerListComponent),
          },
          {
            path: 'create-supplier-dealer',
            loadComponent: () =>
              import(
                './pages/configuration/supplier-dealer/create-supplier-dealer/create-supplier-dealer.component'
              ).then((m) => m.CreateSupplierDealerComponent),
          },
          {
            path: 'view-supplier-dealer/:oid',
            loadComponent: () =>
              import(
                './pages/configuration/supplier-dealer/view-supplier-dealer-details/view-supplier-dealer-details.component'
              ).then((m) => m.ViewSupplierDealerDetailsComponent),
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
