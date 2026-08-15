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
          ]
        : []),
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
