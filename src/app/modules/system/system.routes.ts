import { Routes } from '@angular/router';
import { firstChildGuard } from '@app/core/guards/first-child/first-child.guard';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { unsavedChangesGuard } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { FEATURE_LIST } from '@app/modules/system/feature/config/feature-list.config';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';

/** Everything under /app/system. Each URL is the route of its menu item. */
export const SYSTEM_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
            { path: '', pathMatch: 'full', canActivate: [firstChildGuard], children: [] },
            {
                path: 'features',
                canActivate: [permissionGuard],
                data: { permission: FEATURE_LIST.permission },
                loadComponent: () => import('./feature/pages/feature-list/feature-list.component').then((m) => m.FeatureListComponent),
            },
            {
                path: 'features/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'system.feature.edit' },
                loadComponent: () => import('./feature/pages/feature-edit/feature-edit.component').then((m) => m.FeatureEditComponent),
            },
            {
                path: 'features/:oid',
                canActivate: [permissionGuard],
                data: { permission: FEATURE_LIST.permission },
                loadComponent: () => import('./feature/pages/feature-detail/feature-detail.component').then((m) => m.FeatureDetailComponent),
            },
        ],
    },
];
