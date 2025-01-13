import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthComponent } from './auth.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { LoginPageSecondaryComponent } from './pages/login-page-secondary/login-page-secondary.component';

const routes: Routes = [
  {
    path: '',
    component: AuthComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        component: LoginPageComponent,
        data: { returnUrl: window.location.pathname },
      },
      // {
      //   path: 'login',
      //   component: LoginPageSecondaryComponent,
      //   data: { returnUrl: window.location.pathname },
      // },
      { path: '**', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
