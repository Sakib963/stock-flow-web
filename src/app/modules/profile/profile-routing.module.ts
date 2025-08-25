import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { ChangePasswordComponent } from './pages/change-password/change-password.component';

const routes: Routes = [
  {path: '', component: ProfileComponent},
  {path: 'change-password', component: ChangePasswordComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule { }
