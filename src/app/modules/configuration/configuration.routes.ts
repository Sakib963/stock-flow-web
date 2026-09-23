import { Routes } from '@angular/router';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { unsavedChangesGuard } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { CATEGORY_LIST } from '@app/modules/configuration/config/category-list/category-list.config';

/** Everything under /app/configuration. Each URL is the route of its menu item. */
export const CONFIGURATION_ROUTES: Routes = [
    {
        // Loaded with this module rather than at the root, so a screen nobody has opened yet costs
        // nothing. The unsaved-changes guard and the code generator both open a modal.
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
            {
                path: 'categories',
                canActivate: [permissionGuard],
                data: { permission: CATEGORY_LIST.permission },
                loadComponent: () => import('./pages/category-list/category-list.component').then((m) => m.CategoryListComponent),
            },
            // Before ':oid', or "new" is read as a category's id and the form tries to load it.
            {
                path: 'categories/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.category.create' },
                loadComponent: () => import('./pages/category-create/category-create.component').then((m) => m.CategoryCreateComponent),
            },
            {
                path: 'categories/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'configuration.category.edit' },
                loadComponent: () => import('./pages/category-edit/category-edit.component').then((m) => m.CategoryEditComponent),
            },
            {
                path: 'categories/:oid',
                canActivate: [permissionGuard],
                data: { permission: CATEGORY_LIST.permission },
                loadComponent: () => import('./pages/category-detail/category-detail.component').then((m) => m.CategoryDetailComponent),
            },
        ],
    },
];
