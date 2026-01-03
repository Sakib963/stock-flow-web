import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import(
        './pages/configuration-dashboard/configuration-dashboard.component'
      ).then((m) => m.ConfigurationDashboardComponent),
  },
  {
    path: 'category',
    children: [
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full',
      },
      {
        path: 'create',
        loadComponent: () =>
          import(
            './pages/category/create-category/create-category.component'
          ).then((m) => m.CreateCategoryComponent),
      },
      {
        path: 'view/:oid',
        loadComponent: () =>
          import(
            './pages/category/view-category-details/view-category-details.component'
          ).then((m) => m.ViewCategoryDetailsComponent),
      },
      {
        path: 'list',
        loadComponent: () =>
          import('./pages/category/category-list/category-list.component').then(
            (m) => m.CategoryListComponent
          ),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConfigurationRoutingModule {}
