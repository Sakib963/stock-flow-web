import { Routes } from '@angular/router';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { unsavedChangesGuard } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { CUSTOMER_LIST } from '@app/modules/sales/customer/config/customer-list.config';

/** Everything under /app/sales. Each URL is the route of its menu item. */
export const SALES_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
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
                loadComponent: () => import('./online-order/pages/online-order/online-order.component').then((m) => m.OnlineOrderComponent),
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
