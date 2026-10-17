import { Routes } from '@angular/router';
import { authGuard } from '@app/core/guards/auth/auth.guard';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { sessionGuard } from '@app/core/guards/session/session.guard';

// Opening the app lands on '', which redirects by session: into the shell if a token is stored,
// out to sign-in if not. The boot skeleton in index.html covers the moment before this resolves.
//
// Feature routes live with their feature. This file is the map of the app, not a list of screens.
export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'app' },
    {
        path: 'auth',
        loadChildren: () => import('@app/modules/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    },
    {
        // Everything signed in sits inside the shell, so the menu and header are rendered once.
        path: 'app',
        // authGuard answers whether there is a session, sessionGuard makes sure its payload is
        // loaded. Signing in does not reload the page, so the app initializer never sees it.
        canActivate: [authGuard, sessionGuard],
        loadComponent: () => import('@app/layout/layout.component').then((m) => m.LayoutComponent),
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            {
                path: 'dashboard',
                canActivate: [permissionGuard],
                data: { permission: 'dashboard.overview.view' },
                loadComponent: () => import('@app/modules/dashboard/pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
            },
            {
                path: 'settings',
                loadChildren: () => import('@app/modules/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
            },
            {
                // A person's own account: every signed-in person has it, so no permission.
                path: 'change-password',
                loadComponent: () => import('@app/modules/profile/pages/change-password/change-password.component').then((m) => m.ChangePasswordComponent),
            },
            {
                path: 'activity-log',
                loadChildren: () => import('@app/modules/activity-log/activity-log.routes').then((m) => m.ACTIVITY_LOG_ROUTES),
            },
            {
                path: 'configuration',
                loadChildren: () => import('@app/modules/configuration/configuration.routes').then((m) => m.CONFIGURATION_ROUTES),
            },
            {
                path: 'inventory',
                loadChildren: () => import('@app/modules/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
            },
            {
                path: 'sales',
                loadChildren: () => import('@app/modules/sales/sales.routes').then((m) => m.SALES_ROUTES),
            },
            {
                path: 'marketing',
                loadChildren: () => import('@app/modules/marketing/marketing.routes').then((m) => m.MARKETING_ROUTES),
            },
            {
                path: 'administration',
                loadChildren: () => import('@app/modules/administration/administration.routes').then((m) => m.ADMINISTRATION_ROUTES),
            },
            // Any address inside the shell that is no page says so, rather than leaving an empty page.
            { path: '**', loadComponent: () => import('@app/layout/components/not-found/not-found.component').then((m) => m.NotFoundComponent) },
        ],
    },
    { path: '**', redirectTo: 'app/not-found' },
];
