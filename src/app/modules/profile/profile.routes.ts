import { Routes } from '@angular/router';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';

/** /app/change-password. Lazy, so the modal it asks with is loaded with it, not with the first screen. */
export const PROFILE_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        loadComponent: () => import('./pages/change-password/change-password.component').then((m) => m.ChangePasswordComponent),
    },
];
