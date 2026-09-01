import { Routes } from '@angular/router';
import { authGuard } from '@app/core/guards/auth.guard';
import { permissionGuard } from '@app/core/guards/permission.guard';

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
        canActivate: [authGuard],
        loadComponent: () => import('@app/layout/layout.component').then((m) => m.LayoutComponent),
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            {
                path: 'dashboard',
                canActivate: [permissionGuard],
                data: { permission: 'dashboard.overview.view' },
                loadComponent: () => import('@app/modules/dashboard/pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
            },
        ],
    },
    { path: '**', redirectTo: '' },
];
