import { Routes } from '@angular/router';
import { authGuard } from '@app/core/guards/auth.guard';

// Opening the app lands on '', which redirects by session: into the shell if a token is stored,
// out to sign-in if not. The boot skeleton in index.html covers the moment before this resolves.
//
// Feature routes live with their feature. This file is the map of the app, not a list of screens.
export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        canActivate: [authGuard],
        loadComponent: () => import('@app/layout/layout.component').then((m) => m.LayoutComponent),
    },
    {
        path: 'auth',
        loadChildren: () => import('@app/modules/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    },
    {
        path: 'app',
        canActivate: [authGuard],
        loadComponent: () => import('@app/layout/layout.component').then((m) => m.LayoutComponent),
    },
    { path: '**', redirectTo: '' },
];
