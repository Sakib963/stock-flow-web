import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { getBreadcrumbsByKey } from '@app/core/config/breadcrumb.registry';

interface StatCard {
  title: string;
  count: number;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  route: string;
}

interface QuickAction {
  label: string;
  icon: string;
  route: string;
  color: string;
}

interface RecentActivity {
  title: string;
  description: string;
  time: string;
  icon: string;
  type: 'create' | 'update' | 'delete';
}

@Component({
  selector: 'app-configuration-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgZorroCustomModule,
    PageHeaderComponent,
  ],
  templateUrl: './configuration-dashboard.component.html',
  styleUrls: ['./configuration-dashboard.component.scss'],
})
export class ConfigurationDashboardComponent implements OnInit {
  breadcrumbs = getBreadcrumbsByKey('configuration.dashboard.main');
  
  // Signals for reactive data
  loading = signal(true);
  statsCards = signal<StatCard[]>([]);
  quickActions = signal<QuickAction[]>([]);
  recentActivities = signal<RecentActivity[]>([]);
  
  // Distribution data for charts
  categoryDistribution = signal<any[]>([]);
  suppliersByRegion = signal<any[]>([]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  /**
   * Load mock dashboard data
   * TODO: Replace with actual API calls later
   */
  private loadDashboardData(): void {
    // Simulate API call delay
    setTimeout(() => {
      this.loadStatCards();
      this.loadQuickActions();
      this.loadRecentActivities();
      this.loadChartData();
      this.loading.set(false);
    }, 800);
  }

  /**
   * Load statistics cards with mock data
   */
  private loadStatCards(): void {
    this.statsCards.set([
      {
        title: 'Categories',
        count: 48,
        icon: 'appstore',
        color: '#594ED1',
        trend: { value: 12, isPositive: true },
        route: '/configuration/category/list',
      },
      {
        title: 'Sub Categories',
        count: 156,
        icon: 'block',
        color: '#7E75E5',
        trend: { value: 8, isPositive: true },
        route: '/configuration/sub-category/list',
      },
      {
        title: 'Brands',
        count: 89,
        icon: 'flag',
        color: '#52C41A',
        trend: { value: 5, isPositive: false },
        route: '/configuration/brands/list',
      },
      {
        title: 'Suppliers',
        count: 34,
        icon: 'team',
        color: '#1890FF',
        trend: { value: 15, isPositive: true },
        route: '/configuration/supplier/list',
      },
      {
        title: 'Products',
        count: 523,
        icon: 'shopping',
        color: '#FA8C16',
        trend: { value: 23, isPositive: true },
        route: '/configuration/product/list',
      },
      {
        title: 'Warehouses',
        count: 12,
        icon: 'home',
        color: '#13C2C2',
        trend: { value: 2, isPositive: true },
        route: '/configuration/warehouse/list',
      },
      {
        title: 'Aisles/Zones',
        count: 87,
        icon: 'apartment',
        color: '#EB2F96',
        trend: { value: 4, isPositive: true },
        route: '/configuration/aisle/list',
      },
      {
        title: 'Total Items',
        count: 949,
        icon: 'database',
        color: '#722ED1',
        trend: { value: 67, isPositive: true },
        route: '/configuration',
      },
    ]);
  }

  /**
   * Load quick action buttons
   */
  private loadQuickActions(): void {
    this.quickActions.set([
      {
        label: 'Add Category',
        icon: 'plus-circle',
        route: '/configuration/category/create',
        color: 'primary',
      },
      {
        label: 'Add Brand',
        icon: 'plus-circle',
        route: '/configuration/brands/create',
        color: 'primary',
      },
      {
        label: 'Add Supplier',
        icon: 'plus-circle',
        route: '/configuration/supplier/create',
        color: 'primary',
      },
      {
        label: 'Add Product',
        icon: 'plus-circle',
        route: '/configuration/product/create',
        color: 'primary',
      },
    ]);
  }

  /**
   * Load recent activities
   */
  private loadRecentActivities(): void {
    this.recentActivities.set([
      {
        title: 'New Category Created',
        description: 'Electronics category was added to the system',
        time: '2 minutes ago',
        icon: 'check-circle',
        type: 'create',
      },
      {
        title: 'Brand Updated',
        description: 'Samsung brand information has been updated',
        time: '15 minutes ago',
        icon: 'edit',
        type: 'update',
      },
      {
        title: 'Supplier Added',
        description: 'Global Distributors Ltd. added as new supplier',
        time: '1 hour ago',
        icon: 'check-circle',
        type: 'create',
      },
      {
        title: 'Product Updated',
        description: 'iPhone 15 Pro specifications updated',
        time: '2 hours ago',
        icon: 'edit',
        type: 'update',
      },
      {
        title: 'Warehouse Created',
        description: 'New warehouse location added in California',
        time: '3 hours ago',
        icon: 'check-circle',
        type: 'create',
      },
    ]);
  }

  /**
   * Load chart data
   */
  private loadChartData(): void {
    this.categoryDistribution.set([
      { name: 'Electronics', value: 35 },
      { name: 'Clothing', value: 25 },
      { name: 'Food & Beverage', value: 20 },
      { name: 'Home & Garden', value: 15 },
      { name: 'Others', value: 5 },
    ]);

    this.suppliersByRegion.set([
      { name: 'North America', value: 12 },
      { name: 'Europe', value: 10 },
      { name: 'Asia', value: 8 },
      { name: 'Others', value: 4 },
    ]);
  }

  /**
   * Get icon color class based on activity type
   */
  getActivityIconColor(type: 'create' | 'update' | 'delete'): string {
    switch (type) {
      case 'create':
        return 'text-green-500';
      case 'update':
        return 'text-blue-500';
      case 'delete':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }

  /**
   * Calculate percentage for progress bars
   */
  getPercentage(value: number, total: number): number {
    return Math.round((value / total) * 100);
  }
}
