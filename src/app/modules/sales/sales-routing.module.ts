import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotFoundComponent } from '@app/shared/components/not-found/not-found.component';
import { SalesComponent } from './sales.component';

const routes: Routes = [
  {
    path: '',
    component: SalesComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/sales-dashboard/sales-dashboard.component').then(
            (m) => m.SalesDashboardComponent
          ),
      },
      {
        path: 'quick-sale',
        loadComponent: () =>
          import('./pages/quick-sale/quick-sale.component').then(
            (m) => m.QuickSaleComponent
          ),
      },
      {
        path: 'quick-sale/:invoiceId',
        loadComponent: () =>
          import('./pages/quick-sale/quick-sale.component').then(
            (m) => m.QuickSaleComponent
          ),
      },
      {
        path: 'invoice',
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
                './pages/invoice/display-invoice-list/display-invoice-list.component'
              ).then((m) => m.DisplayInvoiceListComponent),
          },
          {
            path: 'view-invoice/:invoiceId',
            loadComponent: () =>
              import(
                './pages/invoice/view-invoice-details/view-invoice-details.component'
              ).then((m) => m.ViewInvoiceDetailsComponent)
          }
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
                './pages/product-return/display-product-return-list/display-product-return-list.component'
              ).then((m) => m.DisplayProductReturnListComponent),
          },
          {
            path: 'view-product-return/:oid',
            loadComponent: () =>
              import(
                './pages/product-return/view-product-return-details/view-product-return-details.component'
              ).then((m) => m.ViewProductReturnDetailsComponent),
          }
        ]
      }
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
export class SalesRoutingModule {}
