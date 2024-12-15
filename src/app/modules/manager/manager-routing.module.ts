import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManagerComponent } from './manager.component';

const routes: Routes = [
  {
    path: '',
    component: ManagerComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/manager-dashboard/manager-dashboard.component').then(
            (m) => m.ManagerDashboardComponent
          ),
      },
      {
        path: 'category',
        children: [
          {
            path: '',
            redirectTo: 'category-list',
            pathMatch: 'full',
          },
          {
            path: 'category-list',
            loadComponent: () =>
              import(
                './pages/category/display-category-list/display-category-list.component'
              ).then((m) => m.DisplayCategoryListComponent),
          },
          {
            path: 'create-category',
            loadComponent: () =>
              import('./pages/category/create-category/create-category.component').then(
                (m) => m.CreateCategoryComponent
              ),
          },
          {
            path: 'view-category/:oid',
            loadComponent: () =>
              import(
                './pages/category/view-category-details/view-category-details.component'
              ).then((m) => m.ViewCategoryDetailsComponent),
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManagerRoutingModule {}
