import { Routes } from '@angular/router';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { unsavedChangesGuard } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';

/** Everything under /app/settings. Lazy, so the modal it asks with is loaded with it, not with the first screen. */
export const SETTINGS_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
            {
                path: '',
                pathMatch: 'full',
                canActivate: [permissionGuard],
                data: { permission: 'settings.business.view' },
                loadComponent: () => import('./pages/business-settings/business-settings.component').then((m) => m.BusinessSettingsComponent),
            },
            {
                path: 'edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'settings.business.edit' },
                loadComponent: () => import('./pages/business-settings-edit/business-settings-edit.component').then((m) => m.BusinessSettingsEditComponent),
            },
        ],
    },
];
