import { Routes } from '@angular/router';
import { guestGuard } from '@app/core/guards/auth.guard';

/**
 * Everything under /auth. Kept with the module rather than in app.routes.ts so the feature owns
 * its own paths, and so app.routes.ts stays a map of the app rather than a list of every screen.
 *
 * Recovery is three routes rather than one stepper, so the browser back button means what it
 * looks like it means.
 */
export const AUTH_ROUTES: Routes = [
    {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
    },
    {
        // Where a session that ended without the person asking lands, with why.
        path: 'session-ended',
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/session-ended/session-ended.component').then((m) => m.SessionEndedComponent),
    },
    {
        path: 'forgot-password',
        loadComponent: () => import('./pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./pages/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
    },
    {
        path: 'reset-password/done',
        loadComponent: () => import('./pages/reset-done/reset-done.component').then((m) => m.ResetDoneComponent),
    },
    { path: '', pathMatch: 'full', redirectTo: 'login' },
];
