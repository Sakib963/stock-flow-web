import { Routes } from '@angular/router';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { unsavedChangesGuard } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PURCHASE_ORDER_LIST } from '@app/modules/inventory/purchase-order/config/purchase-order-list.config';
import { STOCK_MOVEMENT_LIST } from '@app/modules/inventory/stock-movement/config/stock-movement-list.config';
import { STOCK_OVERVIEW_LIST } from '@app/modules/inventory/stock-overview/config/stock-overview-list.config';

/** Everything under /app/inventory. Each URL is the route of its menu item. */
export const INVENTORY_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
            {
                path: 'overview',
                canActivate: [permissionGuard],
                data: { permission: STOCK_OVERVIEW_LIST.permission },
                loadComponent: () => import('./stock-overview/pages/stock-overview-list/stock-overview-list.component').then((m) => m.StockOverviewListComponent),
            },
            {
                path: 'overview/:oid',
                canActivate: [permissionGuard],
                data: { permission: STOCK_OVERVIEW_LIST.permission },
                loadComponent: () => import('./stock-overview/pages/product-stock/product-stock.component').then((m) => m.ProductStockComponent),
            },
            {
                path: 'stock-movements',
                canActivate: [permissionGuard],
                data: { permission: STOCK_MOVEMENT_LIST.permission },
                loadComponent: () => import('./stock-movement/pages/stock-movement-list/stock-movement-list.component').then((m) => m.StockMovementListComponent),
            },
            {
                path: 'purchase-orders',
                canActivate: [permissionGuard],
                data: { permission: PURCHASE_ORDER_LIST.permission },
                loadComponent: () => import('./purchase-order/pages/purchase-order-list/purchase-order-list.component').then((m) => m.PurchaseOrderListComponent),
            },
            // Before ':oid', or "new" is read as an order's id.
            {
                path: 'purchase-orders/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'inventory.purchase-order.create' },
                loadComponent: () => import('./purchase-order/pages/purchase-order-create/purchase-order-create.component').then((m) => m.PurchaseOrderCreateComponent),
            },
            {
                path: 'purchase-orders/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'inventory.purchase-order.edit' },
                loadComponent: () => import('./purchase-order/pages/purchase-order-edit/purchase-order-edit.component').then((m) => m.PurchaseOrderEditComponent),
            },
            {
                path: 'purchase-orders/:oid/verify',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'inventory.purchase-order.approve' },
                loadComponent: () => import('./purchase-order/pages/purchase-order-verify/purchase-order-verify.component').then((m) => m.PurchaseOrderVerifyComponent),
            },
            {
                path: 'purchase-orders/:oid',
                canActivate: [permissionGuard],
                data: { permission: PURCHASE_ORDER_LIST.permission },
                loadComponent: () => import('./purchase-order/pages/purchase-order-detail/purchase-order-detail.component').then((m) => m.PurchaseOrderDetailComponent),
            },
        ],
    },
];
