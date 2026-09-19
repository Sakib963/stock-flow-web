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
                path: 'configuration',
                loadChildren: () => import('@app/modules/configuration/configuration.routes').then((m) => m.CONFIGURATION_ROUTES),
            },
        ],
    },
    { path: '**', redirectTo: '' },
];
