import { Routes } from '@angular/router';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { firstChildGuard } from '@app/core/guards/first-child/first-child.guard';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { unsavedChangesGuard } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { CUSTOMER_LIST } from '@app/modules/sales/customer/config/customer-list.config';

/** Everything under /app/sales. Each URL is the route of its menu item. */
export const SALES_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
            { path: '', pathMatch: 'full', canActivate: [firstChildGuard], children: [] },
            {
                path: 'pos',
                canActivate: [permissionGuard],
                data: { permission: 'sales.pos.view' },
                loadComponent: () => import('./pos/pages/pos.component').then((m) => m.PosComponent),
            },
            {
                path: 'online-order',
                canActivate: [permissionGuard],
                data: { permission: 'sales.online.view' },
                loadComponent: () => import('./online-order/pages/online-order.component').then((m) => m.OnlineOrderComponent),
            },
            {
                path: 'analytics',
                canActivate: [permissionGuard],
                data: { permission: 'sales.analytics.view' },
                loadComponent: () => import('./analytics/pages/sales-analytics/sales-analytics.component').then((m) => m.SalesAnalyticsComponent),
            },
            {
                path: 'settings',
                canActivate: [permissionGuard],
                data: { permission: 'sales.settings.view' },
                loadComponent: () => import('./settings/pages/sales-settings/sales-settings.component').then((m) => m.SalesSettingsComponent),
            },
            {
                path: 'online-order/:oid/edit',
                canActivate: [permissionGuard],
                data: { permission: 'sales.order.edit' },
                loadComponent: () => import('./online-order/pages/online-order.component').then((m) => m.OnlineOrderComponent),
            },
            {
                path: 'orders',
                canActivate: [permissionGuard],
                data: { permission: 'sales.order.view' },
                loadComponent: () => import('./order/pages/order-list/order-list.component').then((m) => m.OrderListComponent),
            },
            {
                path: 'orders/:oid',
                canActivate: [permissionGuard],
                data: { permission: 'sales.order.view' },
                loadComponent: () => import('./order/pages/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
            },
            {
                path: 'order-history',
                canActivate: [permissionGuard],
                data: { permission: 'sales.order-history.view', scope: 'history' },
                loadComponent: () => import('./order/pages/order-list/order-list.component').then((m) => m.OrderListComponent),
            },
            {
                path: 'order-history/:oid',
                canActivate: [permissionGuard],
                data: { permission: 'sales.order-history.view', scope: 'history' },
                loadComponent: () => import('./order/pages/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
            },
            {
                path: 'returns',
                canActivate: [permissionGuard],
                data: { permission: 'sales.return.view' },
                loadComponent: () => import('./return/pages/return-list/return-list.component').then((m) => m.ReturnListComponent),
            },
            {
                path: 'returns/:oid',
                canActivate: [permissionGuard],
                data: { permission: 'sales.return.view' },
                loadComponent: () => import('./return/pages/return-detail/return-detail.component').then((m) => m.ReturnDetailComponent),
            },
            {
                path: 'giveaways',
                canActivate: [permissionGuard],
                data: { permission: 'sales.giveaway.view' },
                loadComponent: () => import('./giveaway/pages/giveaway-list/giveaway-list.component').then((m) => m.GiveawayListComponent),
            },
            {
                path: 'giveaways/new',
                canActivate: [permissionGuard],
                data: { permission: 'sales.giveaway.create' },
                loadComponent: () => import('./giveaway/pages/giveaway-create/giveaway-create.component').then((m) => m.GiveawayCreateComponent),
            },
            {
                path: 'giveaways/:oid',
                canActivate: [permissionGuard],
                data: { permission: 'sales.giveaway.view' },
                loadComponent: () => import('./giveaway/pages/giveaway-detail/giveaway-detail.component').then((m) => m.GiveawayDetailComponent),
            },
            {
                path: 'delivery-batches',
                canActivate: [permissionGuard],
                data: { permission: 'sales.delivery-batch.view' },
                loadComponent: () => import('./delivery-batch/pages/delivery-batch-list/delivery-batch-list.component').then((m) => m.DeliveryBatchListComponent),
            },
            {
                path: 'delivery-batches/new',
                canActivate: [permissionGuard],
                data: { permission: 'sales.delivery-batch.create' },
                loadComponent: () => import('./delivery-batch/pages/delivery-batch-create/delivery-batch-create.component').then((m) => m.DeliveryBatchCreateComponent),
            },
            {
                path: 'delivery-batches/:oid',
                canActivate: [permissionGuard],
                data: { permission: 'sales.delivery-batch.view' },
                loadComponent: () => import('./delivery-batch/pages/delivery-batch-detail/delivery-batch-detail.component').then((m) => m.DeliveryBatchDetailComponent),
            },
            {
                path: 'pre-orders',
                canActivate: [permissionGuard],
                data: { permission: 'sales.pre-order.view' },
                loadComponent: () => import('./pre-order/pages/pre-order-list/pre-order-list.component').then((m) => m.PreOrderListComponent),
            },
            {
                path: 'pre-orders/by-product',
                canActivate: [permissionGuard],
                data: { permission: 'sales.pre-order.view' },
                loadComponent: () => import('./pre-order/pages/pre-order-by-product/pre-order-by-product.component').then((m) => m.PreOrderByProductComponent),
            },
            {
                path: 'pre-orders/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'sales.pre-order.create' },
                loadComponent: () => import('./pre-order/pages/pre-order-create/pre-order-create.component').then((m) => m.PreOrderCreateComponent),
            },
            {
                path: 'pre-orders/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'sales.pre-order.edit' },
                loadComponent: () => import('./pre-order/pages/pre-order-edit/pre-order-edit.component').then((m) => m.PreOrderEditComponent),
            },
            {
                path: 'pre-orders/:oid',
                canActivate: [permissionGuard],
                data: { permission: 'sales.pre-order.view' },
                loadComponent: () => import('./pre-order/pages/pre-order-detail/pre-order-detail.component').then((m) => m.PreOrderDetailComponent),
            },
            {
                path: 'customers',
                canActivate: [permissionGuard],
                data: { permission: CUSTOMER_LIST.permission },
                loadComponent: () => import('./customer/pages/customer-list/customer-list.component').then((m) => m.CustomerListComponent),
            },
            {
                path: 'customers/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'sales.customer.create' },
                loadComponent: () => import('./customer/pages/customer-create/customer-create.component').then((m) => m.CustomerCreateComponent),
            },
            {
                path: 'customers/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'sales.customer.edit' },
                loadComponent: () => import('./customer/pages/customer-edit/customer-edit.component').then((m) => m.CustomerEditComponent),
            },
            {
                path: 'customers/:oid',
                canActivate: [permissionGuard],
                data: { permission: CUSTOMER_LIST.permission },
                loadComponent: () => import('./customer/pages/customer-detail/customer-detail.component').then((m) => m.CustomerDetailComponent),
            },
        ],
    },
];
