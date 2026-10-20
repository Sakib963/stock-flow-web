import { Routes } from '@angular/router';
import { firstChildGuard } from '@app/core/guards/first-child/first-child.guard';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { REPORT_PERMISSION } from '@app/modules/report/config/reports.config';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';

const groupPage = () => import('./pages/report-group/report-group.component').then((m) => m.ReportGroupComponent);
const reportPage = () => import('./pages/report-view/report-view.component').then((m) => m.ReportViewComponent);

export const REPORT_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
            { path: '', pathMatch: 'full', canActivate: [firstChildGuard], children: [] },
            { path: 'sales', canActivate: [permissionGuard], data: { permission: REPORT_PERMISSION.sales.view, group: 'sales' }, loadComponent: groupPage },
            { path: 'sales/:report', canActivate: [permissionGuard], data: { permission: REPORT_PERMISSION.sales.view, group: 'sales' }, loadComponent: reportPage },
            { path: 'stock', canActivate: [permissionGuard], data: { permission: REPORT_PERMISSION.stock.view, group: 'stock' }, loadComponent: groupPage },
            { path: 'customers', canActivate: [permissionGuard], data: { permission: REPORT_PERMISSION.customer.view, group: 'customer' }, loadComponent: groupPage },
            { path: 'customers/:report', canActivate: [permissionGuard], data: { permission: REPORT_PERMISSION.customer.view, group: 'customer' }, loadComponent: reportPage },
            { path: 'marketing', canActivate: [permissionGuard], data: { permission: REPORT_PERMISSION.marketing.view, group: 'marketing' }, loadComponent: groupPage },
            { path: 'marketing/:report', canActivate: [permissionGuard], data: { permission: REPORT_PERMISSION.marketing.view, group: 'marketing' }, loadComponent: reportPage },
            { path: 'stock/:report', canActivate: [permissionGuard], data: { permission: REPORT_PERMISSION.stock.view, group: 'stock' }, loadComponent: reportPage },
        ],
    },
];
