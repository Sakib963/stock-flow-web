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
                loadComponent: () => import('./pages/manager-dashboard/manager-dashboard.component').then((m) => m.ManagerDashboardComponent),
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
                                loadComponent: () => import('./pages/inventory/inventory-overview/inventory-overview-list/inventory-overview-list.component').then((m) => m.InventoryOverviewListComponent),
                            },
                            {
                                path: 'view-product/:oid',
                                loadComponent: () => import('./pages/inventory/inventory-overview/view-inventory-overview-details/view-inventory-overview-details.component').then((m) => m.ViewInventoryOverviewDetailsComponent),
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
                                loadComponent: () => import('./pages/inventory/purchase-order/purchase-order-list/purchase-order-list.component').then((m) => m.PurchaseOrderListComponent),
                            },
                            {
                                path: 'create-purchase-order',
                                loadComponent: () => import('./pages/inventory/purchase-order/create-purchase-order/create-purchase-order.component').then((m) => m.CreatePurchaseOrderComponent),
                            },
                            {
                                path: 'view-purchase-order/:oid',
                                loadComponent: () => import('./pages/inventory/purchase-order/view-purchase-order/view-purchase-order.component').then((m) => m.ViewPurchaseOrderComponent),
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
                                loadComponent: () => import('./pages/inventory/invoice/invoice-list/invoice-list.component').then((m) => m.InvoiceListComponent),
                            },
                            {
                                path: 'view-invoice/:oid',
                                loadComponent: () => import('./pages/inventory/invoice/view-invoice-details-for-manager/view-invoice-details-for-manager.component').then((m) => m.ViewInvoiceDetailsForManagerComponent),
                            },
                        ],
                    },
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
                                loadComponent: () => import('./pages/employee/attendance/display-employee-attendance-list/display-employee-attendance-list.component').then((m) => m.DisplayEmployeeAttendanceListComponent),
                            },
                            {
                                path: 'view-attendance-details/:oid',
                                loadComponent: () => import('./pages/employee/attendance/view-employee-attendance-details/view-employee-attendance-details.component').then((m) => m.ViewEmployeeAttendanceDetailsComponent),
                            },
                        ],
                    },
                ],
            },
            {
                path: 'reports',
                loadComponent: () => import('./pages/report/report.component').then((m) => m.ReportComponent),
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
