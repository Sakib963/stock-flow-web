import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, AngularSvgIconModule],
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.scss'],
})
export class ManagerDashboardComponent {
  constructor(private _router: Router) {}

  redirectToUrl(type: any): any {
    console.log(type);
    if (type === 'Product') {
    } else if (type === 'Categories') {
      this._router.navigate(['/category/category-list']);
    }
  }
}
