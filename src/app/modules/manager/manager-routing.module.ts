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
          {
            path: 'aisle',
            children: [
              {
                path: '',
                redirectTo: 'aisle-list',
                pathMatch: 'full',
              },
              {
                path: 'aisle-list',
                loadComponent: () =>
                  import(
                    './pages/configuration/aisle/display-aisle-list/display-aisle-list.component'
                  ).then((m) => m.DisplayAisleListComponent),
              },
              {
                path: 'create-aisle',
                loadComponent: () =>
                  import(
                    './pages/configuration/aisle/create-aisle/create-aisle.component'
                  ).then((m) => m.CreateAisleComponent),
              },
              {
                path: 'view-aisle/:oid',
                loadComponent: () =>
                  import(
                    './pages/configuration/aisle/view-aisle-details/view-aisle-details.component'
                  ).then((m) => m.ViewAisleDetailsComponent),
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
            children: [
              {
                path: '',
                loadComponent: () =>
                  import(
                    './pages/inventory/inventory-overview/inventory-overview-list/inventory-overview-list.component'
                  ).then((m) => m.InventoryOverviewListComponent),
              },
              {
                path: 'view-product/:oid',
                loadComponent: () =>
                  import(
                    './pages/inventory/inventory-overview/view-inventory-overview-details/view-inventory-overview-details.component'
                  ).then((m) => m.ViewInventoryOverviewDetailsComponent),
              },
            ],
          },
          {
            path: 'purchase-order',
            children: [
              {
                path: '',
                redirectTo: 'purchase-order-list',
                pathMatch: 'full',
              },
              {
                path: 'purchase-order-list',
                loadComponent: () =>
                  import(
                    './pages/inventory/purchase-order/purchase-order-list/purchase-order-list.component'
                  ).then((m) => m.PurchaseOrderListComponent),
              },
              {
                path: 'create-purchase-order',
                loadComponent: () =>
                  import(
                    './pages/inventory/purchase-order/create-purchase-order/create-purchase-order.component'
                  ).then((m) => m.CreatePurchaseOrderComponent),
              },
              {
                path: 'view-purchase-order/:oid',
                loadComponent: () =>
                  import(
                    './pages/inventory/purchase-order/view-purchase-order/view-purchase-order.component'
                  ).then((m) => m.ViewPurchaseOrderComponent),
              },
            ],
          },
          {
            path: 'invoice',
            children: [
              {
                path: '',
                redirectTo: 'invoice-list',
                pathMatch: 'full',
              },
              {
                path: 'invoice-list',
                loadComponent: () =>
                  import(
                    './pages/inventory/invoice/invoice-list/invoice-list.component'
                  ).then((m) => m.InvoiceListComponent),
              },
              {
                path: 'view-invoice/:oid',
                loadComponent: () =>
                  import(
                    './pages/inventory/invoice/view-invoice-details-for-manager/view-invoice-details-for-manager.component'
                  ).then((m) => m.ViewInvoiceDetailsForManagerComponent),
              },
            ],
          },
          {
            path: 'product-return',
            children: [
              {
                path: '',
                redirectTo: 'list',
                pathMatch: 'full',
              },
              {
                path: 'list',
                loadComponent: () =>
                  import(
                    './pages/inventory/product-return/display-product-return-list-for-manager/display-product-return-list-for-manager.component'
                  ).then((m) => m.DisplayProductReturnListForManagerComponent),
              },
              {
                path: 'view-product-return/:oid',
                loadComponent: () =>
                  import(
                    './pages/inventory/product-return/view-product-return-details-for-manager/view-product-return-details-for-manager.component'
                  ).then((m) => m.ViewProductReturnDetailsForManagerComponent),
              },
            ],
          },
          {
            path: 'product-dispose',
            children: [
              {
                path: '',
                redirectTo: 'list',
                pathMatch: 'full',
              },
              {
                path: 'list',
                loadComponent: () =>
                  import(
                    './pages/inventory/product-dispose/display-product-dispose-list/display-product-dispose-list.component'
                  ).then((m) => m.DisplayProductDisposeListComponent),
              },
              {
                path: 'create-product-dispose',
                loadComponent: () =>
                  import(
                    './pages/inventory/product-dispose/create-product-dispose/create-product-dispose.component'
                  ).then((m) => m.CreateProductDisposeComponent),
              },
              {
                path: 'view-product-dispose/:oid',
                loadComponent: () =>
                  import(
                    './pages/inventory/product-dispose/view-product-dispose-details/view-product-dispose-details.component'
                  ).then((m) => m.ViewProductDisposeDetailsComponent),
              }
            ]
          }
        ],
      },
      {
        path: 'employee',
        children: [
          {
            path: 'attendance',
            children: [
              {
                path: '',
                redirectTo: 'attendance-list',
                pathMatch: 'full',
              },
              {
                path: 'attendance-list',
                loadComponent: () =>
                  import(
                    './pages/employee/attendance/display-employee-attendance-list/display-employee-attendance-list.component'
                  ).then((m) => m.DisplayEmployeeAttendanceListComponent),
              },
              {
                path: 'view-attendance-details/:oid',
                loadComponent: () =>
                  import(
                    './pages/employee/attendance/view-employee-attendance-details/view-employee-attendance-details.component'
                  ).then((m) => m.ViewEmployeeAttendanceDetailsComponent),
              },
            ],
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
