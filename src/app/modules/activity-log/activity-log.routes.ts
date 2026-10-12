import { Routes } from '@angular/router';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';

/** /app/activity-log. Lazy, so the filter's modal is loaded with it, not with the first screen. */
export const ACTIVITY_LOG_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        canActivate: [permissionGuard],
        data: { permission: 'activity-log.activity-log.view' },
        loadComponent: () => import('./pages/activity-log/activity-log.component').then((m) => m.ActivityLogComponent),
    },
];
