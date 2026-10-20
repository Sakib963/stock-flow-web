import { Routes } from '@angular/router';
import { firstChildGuard } from '@app/core/guards/first-child/first-child.guard';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';

export const SYSTEM_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
            { path: '', pathMatch: 'full', canActivate: [firstChildGuard], children: [] },
            {
                path: 'health',
                canActivate: [permissionGuard],
                data: { permission: 'system.observability.view' },
                loadComponent: () => import('./observability/pages/observability/observability.component').then((m) => m.ObservabilityComponent),
            },
        ],
    },
];
