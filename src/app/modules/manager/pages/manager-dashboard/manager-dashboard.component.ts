import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.scss'],
})
export class ManagerDashboardComponent {
  constructor(private _router: Router) {}

  redirectToUrl(type: any): any {
    console.log(type);
    if (type === 'Product') {
      // this._router.navigate(['../product-list'], {
      //   relativeTo: this._activatedRoute,
      // });
    } else if (type === 'Categories') {
      this._router.navigate(['/category/category-list']);
    }
  }
}