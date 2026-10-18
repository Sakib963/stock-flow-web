import { Routes } from '@angular/router';
import { firstChildGuard } from '@app/core/guards/first-child/first-child.guard';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { unsavedChangesGuard } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { FEATURE_LIST } from '@app/modules/administration/feature/config/feature-list.config';
import { ROLE_LIST } from '@app/modules/administration/role/config/role-list.config';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';

/** Everything under /app/administration. Each URL is the route of its menu item. */
export const ADMINISTRATION_ROUTES: Routes = [
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
            {
                path: 'roles',
                canActivate: [permissionGuard],
                data: { permission: ROLE_LIST.permission },
                loadComponent: () => import('./role/pages/role-list/role-list.component').then((m) => m.RoleListComponent),
            },
            {
                path: 'roles/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'administration.role.create' },
                loadComponent: () => import('./role/pages/role-create/role-create.component').then((m) => m.RoleCreateComponent),
            },
            {
                path: 'roles/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'administration.role.edit' },
                loadComponent: () => import('./role/pages/role-edit/role-edit.component').then((m) => m.RoleEditComponent),
            },
            {
                path: 'roles/:oid',
                canActivate: [permissionGuard],
                data: { permission: ROLE_LIST.permission },
                loadComponent: () => import('./role/pages/role-detail/role-detail.component').then((m) => m.RoleDetailComponent),
            },
        ],
    },
];
