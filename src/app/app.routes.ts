import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@app/core/guards/auth.guard';

// Opening the app lands on '', which redirects by session: into the shell if a token is stored,
// out to sign-in if not. The boot skeleton in index.html covers the moment before this resolves.
export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        canActivate: [authGuard],
        loadComponent: () => import('@app/layout/layout.component').then((m) => m.LayoutComponent),
    },
    {
        path: 'auth/login',
        canActivate: [guestGuard],
        loadComponent: () => import('@app/modules/auth/pages/login/login.component').then((m) => m.LoginComponent),
    },
    {
        path: 'auth/forgot-password',
        loadComponent: () => import('@app/modules/auth/pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
    },
    {
        path: 'app',
        canActivate: [authGuard],
        loadComponent: () => import('@app/layout/layout.component').then((m) => m.LayoutComponent),
    },
    { path: '**', redirectTo: '' },
];
