import { Routes } from '@angular/router';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { CATEGORY_LIST } from '@app/modules/configuration/config/category-list/category-list.config';

/** Everything under /app/configuration. Each URL is the route of its menu item. */
export const CONFIGURATION_ROUTES: Routes = [
    {
        path: 'categories',
        canActivate: [permissionGuard],
        data: { permission: CATEGORY_LIST.permission },
        loadComponent: () => import('./pages/category-list/category-list.component').then((m) => m.CategoryListComponent),
    },
];
