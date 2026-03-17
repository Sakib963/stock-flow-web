import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/activity-log/activity-log.component').then((m) => m.ActivityLogComponent),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class ActivityLogRoutingModule {}
