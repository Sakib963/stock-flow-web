import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { isOnlineEnabled, isPosEnabled } from '@app/core/constants/company-info';

const routes: Routes = [
    { path: '', redirectTo: 'orders', pathMatch: 'full' },
    // Intake routes are only registered for the channels this shop runs (company-info).
    ...(isPosEnabled()
        ? [
              {
                  path: 'pos',
                  loadComponent: () => import('./pages/pos/pos.component').then((m) => m.PosComponent),
              },
              {
                  path: 'pos/:oid',
                  loadComponent: () => import('./pages/pos/pos.component').then((m) => m.PosComponent),
              },
          ]
        : []),
    ...(isOnlineEnabled()
        ? [
              {
                  path: 'online',
                  loadComponent: () => import('./pages/online-order/online-order.component').then((m) => m.OnlineOrderComponent),
              },
              // Pre-orders are an online-only flow, so they are registered with the
              // rest of the online channel rather than unconditionally.
              {
                  path: 'pre-order',
                  children: [
                      { path: '', redirectTo: 'list', pathMatch: 'full' as const },
                      {
                          path: 'list',
                          loadComponent: () => import('./pages/pre-order/pre-order-list/pre-order-list.component').then((m) => m.PreOrderListComponent),
                      },
                      {
                          path: 'create',
                          loadComponent: () => import('./pages/pre-order/create-pre-order/create-pre-order.component').then((m) => m.CreatePreOrderComponent),
                      },
                      {
                          path: 'view/:oid',
                          loadComponent: () => import('./pages/pre-order/view-pre-order-details/view-pre-order-details.component').then((m) => m.ViewPreOrderDetailsComponent),
                      },
                  ],
              },
          ]
        : []),
    // Returns are raised from an order, so they are registered for every shop,
    // not gated on a channel the way the intake routes are.
    {
        path: 'returns',
        children: [
            { path: '', redirectTo: 'list', pathMatch: 'full' },
            {
                path: 'list',
                loadComponent: () => import('./pages/returns/return-list/return-list.component').then((m) => m.ReturnListComponent),
            },
            {
                path: 'view/:oid',
                loadComponent: () => import('./pages/returns/view-return-details/view-return-details.component').then((m) => m.ViewReturnDetailsComponent),
            },
        ],
    },
    {
        path: 'orders',
        children: [
            { path: '', redirectTo: 'list', pathMatch: 'full' },
            {
                path: 'list',
                loadComponent: () => import('./pages/order-list/order-list.component').then((m) => m.OrderListComponent),
            },
            {
                path: 'view/:oid',
                loadComponent: () => import('./pages/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class SalesRoutingModule {}
