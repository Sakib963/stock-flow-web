import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { UserInfoResolver } from '@app/core/resolvers/user-info.resolver';
import { RoleGuard } from '@app/core/guards/role.guard';
import { ROLES } from '@app/core/constants/constants';
import { NotFoundComponent } from '@app/shared/components/not-found/not-found.component';

const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            {
                path: '',
                redirectTo: 'redirect',
                pathMatch: 'full',
            },
            {
                path: 'redirect',
                loadComponent: () => import('../shared/components/redirect/redirect.component').then((c) => c.RedirectComponent),
            },
            {
                path: 'admin',
                loadChildren: () => import('../modules/admin/admin.module').then((m) => m.AdminModule),
                canActivate: [RoleGuard],
                data: { roles: [ROLES.ADMIN] },
            },
            {
                path: 'configuration',
                loadChildren: () => import('../modules/configuration/configuration.module').then((m) => m.ConfigurationModule),
                canActivate: [RoleGuard],
                data: { roles: [ROLES.ADMIN, ROLES.MANAGER] },
            },
            {
                path: 'inventory',
                loadChildren: () => import('../modules/inventory/inventory.module').then((m) => m.InventoryModule),
                canActivate: [RoleGuard],
                data: { roles: [ROLES.ADMIN, ROLES.MANAGER] },
            },
            {
                path: 'activity-log',
                loadChildren: () => import('../modules/activity-log/activity-log.module').then((m) => m.ActivityLogModule),
                canActivate: [RoleGuard],
                data: { roles: [ROLES.ADMIN, ROLES.MANAGER] },
            },
            {
                path: 'sales',
                loadChildren: () => import('../modules/sales/sales.module').then((m) => m.SalesModule),
                canActivate: [RoleGuard],
                data: { roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESMAN] },
            },
            {
                path: 'settings',
                loadComponent: () => import('../modules/settings/settings.component').then((m) => m.SettingsComponent),
                canActivate: [RoleGuard],
                data: { roles: [ROLES.ADMIN, ROLES.MANAGER] },
            },
            {
                path: 'profile',
                loadChildren: () => import('../modules/profile/profile.module').then((m) => m.ProfileModule),
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class LayoutRoutingModule {}
