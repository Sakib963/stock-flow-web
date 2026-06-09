import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: 'purchase-order',
        children: [
            {
                path: 'list',
                loadComponent: () => import('./pages/purchase-order/purchase-order-list/purchase-order-list.component').then((m) => m.PurchaseOrderListComponent),
            },
            {
                path: 'create',
                loadComponent: () => import('./pages/purchase-order/create-purchase-order/create-purchase-order.component').then((m) => m.CreatePurchaseOrderComponent),
            },
            {
                path: ':oid',
                loadComponent: () => import('./pages/purchase-order/view-purchase-order/view-purchase-order.component').then((m) => m.ViewPurchaseOrderComponent),
            },
            {
                path: '',
                redirectTo: 'list',
                pathMatch: 'full',
            },
        ],
    },
    {
        path: 'overview',
        children: [
            {
                path: 'list',
                loadComponent: () => import('./pages/overview/overview-list/overview-list.component').then((m) => m.OverviewListComponent),
            },
            {
                path: ':oid',
                loadComponent: () => import('./pages/overview/view-overview-details/view-overview-details.component').then((m) => m.ViewOverviewDetailsComponent),
            },
            {
                path: '',
                redirectTo: 'list',
                pathMatch: 'full',
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class InventoryRoutingModule {}
