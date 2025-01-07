import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { UserInfoResolver } from '@app/core/resolvers/user-info.resolver';
import { RoleGuard } from '@app/core/guards/role.guard';
import { ROLES } from '@app/core/constants/constants';
import { NotFoundComponent } from '@app/shared/components/not-found/not-found.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    resolve: { userInfo: UserInfoResolver },
    children: [
      {
        path: 'admin',
        loadChildren: () =>
          import('../modules/admin/admin.module').then((m) => m.AdminModule),
        canActivate: [RoleGuard],
        data: { roles: [ROLES.ADMIN] },
      },
      {
        path: '',
        loadChildren: () =>
          import('../modules/manager/manager.module').then((m) => m.ManagerModule),
        canActivate: [RoleGuard],
        data: { roles: [ROLES.MANAGER] },
      },
      {
        path: 'not-found',
        component: NotFoundComponent,
      },
      {
        path: '**',
        redirectTo: 'not-found',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayoutRoutingModule {}
