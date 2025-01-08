import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { NotFoundComponent } from '@app/shared/components/not-found/not-found.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'user',
        children: [
          {
            path: '',
            redirectTo: 'user-list',
            pathMatch: 'full',
          },
          {
            path: 'user-list',
            loadComponent: () =>
              import(
                './pages/user/display-user-list/display-user-list.component'
              ).then((m) => m.DisplayUserListComponent),
          },
          {
            path: 'create-user',
            loadComponent: () =>
              import('./pages/user/create-user/create-user.component').then(
                (m) => m.CreateUserComponent
              ),
          },
          {
            path: 'view-user/:oid',
            loadComponent: () =>
              import('./pages/user/view-user-details/view-user-details.component').then(
                (m) => m.ViewUserDetailsComponent
              ),
          },
        ],
      },
    ],
  },
  {
    path: 'not-found',
    component: NotFoundComponent,
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
