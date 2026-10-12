import { Routes } from '@angular/router';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';

/** Everything under /app/settings. Lazy, so the modal it asks with is loaded with it, not with the first screen. */
export const SETTINGS_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        canActivate: [permissionGuard],
        data: { permission: 'settings.business.view' },
        loadComponent: () => import('./pages/business-settings/business-settings.component').then((m) => m.BusinessSettingsComponent),
    },
];
