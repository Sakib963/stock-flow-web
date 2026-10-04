import { Routes } from '@angular/router';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';

/** Everything under /app/sales. Each URL is the route of its menu item. */
export const SALES_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
            {
                path: 'pos',
                canActivate: [permissionGuard],
                data: { permission: 'sales.pos.view' },
                loadComponent: () => import('./pos/pages/pos.component').then((m) => m.PosComponent),
            },
        ],
    },
];
