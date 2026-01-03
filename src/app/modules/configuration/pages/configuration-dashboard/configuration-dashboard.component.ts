import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { getBreadcrumbsByKey } from '@app/core/config/breadcrumb.registry';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';

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
    LoaderComponent,
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
   * Load statistics cards with configuration data
   * TODO: Replace with API calls
   * API: GET /api/configuration/statistics
   * Response: { 
   *   categories: number,        // COUNT(*) WHERE status = 'Active'
   *   subCategories: number,     // COUNT(*) WHERE status = 'Active'
   *   brands: number,            // COUNT(*) WHERE status = 'Active'
   *   suppliers: number,         // COUNT(*) WHERE status = 'Active'
   *   products: number,          // COUNT(*) WHERE status = 'Active' AND is_deleted = false
   *   warehouses: number,        // COUNT(*) WHERE status = 'Active'
   *   aisles: number,            // COUNT(*) WHERE status = 'Active'
   *   totalSKUs: number          // COUNT(DISTINCT sku) FROM product
   * }
   */
  private loadStatCards(): void {
    this.statsCards.set([
      {
        title: 'Active Categories',
        count: 46, // status = 'Active' only
        icon: 'appstore',
        color: '#594ED1',
        trend: { value: 3, isPositive: true },
        route: '/configuration/category/list',
      },
      {
        title: 'Sub Categories',
        count: 148,
        icon: 'block',
        color: '#7E75E5',
        trend: { value: 8, isPositive: true },
        route: '/configuration/sub-category/list',
      },
      {
        title: 'Active Brands',
        count: 82, // status = 'Active' only
        icon: 'flag',
        color: '#52C41A',
        trend: { value: 2, isPositive: false },
        route: '/configuration/brands/list',
      },
      {
        title: 'Active Suppliers',
        count: 31, // status = 'Active' only
        icon: 'team',
        color: '#1890FF',
        trend: { value: 4, isPositive: true },
        route: '/configuration/supplier/list',
      },
      {
        title: 'Active Products',
        count: 487, // status = 'Active' AND is_deleted = false
        icon: 'shopping',
        color: '#FA8C16',
        trend: { value: 18, isPositive: true },
        route: '/configuration/product/list',
      },
      {
        title: 'Warehouses',
        count: 12, // status = 'Active'
        icon: 'home',
        color: '#13C2C2',
        trend: { value: 1, isPositive: true },
        route: '/configuration/warehouse/list',
      },
      {
        title: 'Aisles/Zones',
        count: 87, // status = 'Active'
        icon: 'apartment',
        color: '#EB2F96',
        trend: { value: 4, isPositive: true },
        route: '/configuration/aisle/list',
      },
      {
        title: 'Total SKUs',
        count: 487, // Total unique product SKUs
        icon: 'barcode',
        color: '#722ED1',
        trend: { value: 18, isPositive: true },
        route: '/configuration/product/list',
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
        icon: 'appstore', // from menu: assets/icons/category.svg
        route: '/configuration/category/create',
        color: 'primary',
      },
      {
        label: 'Add Sub Category',
        icon: 'block', // from menu: assets/icons/sub_category.svg
        route: '/configuration/sub-category/create',
        color: 'primary',
      },
      {
        label: 'Add Brand',
        icon: 'flag', // from menu: assets/icons/brands.svg
        route: '/configuration/brands/create',
        color: 'primary',
      },
      {
        label: 'Add Supplier',
        icon: 'team', // from menu: assets/icons/source.svg
        route: '/configuration/supplier/create',
        color: 'primary',
      },
      {
        label: 'Add Product',
        icon: 'shopping', // from menu: assets/icons/product.svg
        route: '/configuration/product/create',
        color: 'primary',
      },
      {
        label: 'Add Warehouse',
        icon: 'home', // from menu: assets/icons/warehouse.svg
        route: '/configuration/warehouse/create',
        color: 'primary',
      },
      {
        label: 'Add Aisle/Zone',
        icon: 'apartment', // from menu: assets/icons/shelf.svg
        route: '/configuration/aisle/create',
        color: 'primary',
      },
    ]);
  }

  /**
   * Load recent activities
   * Activities are tracked per module in feature-based tables:
   * - configuration_activities: category, brand, supplier, warehouse, aisle activities
   * - sales_activities: sales transactions
   * - inventory_activities: purchase orders, stock movements
   * - user_activities: login, permissions, profile updates
   * 
   * Schema location: ./activity-log-schema.sql
   * TODO: Replace with actual API call
   * API: GET /api/configuration/activities?limit=10
   * Response: Array<{ title: string, description: string, time: string, icon: string, type: string, created_by: string }>
   */
  private loadRecentActivities(): void {
    // Mock data - Replace with actual API call
    this.recentActivities.set([
      {
        title: 'Category Created',
        description: 'Electronics & Gadgets category added by John Doe',
        time: '5 minutes ago',
        icon: 'check-circle',
        type: 'create',
      },
      {
        title: 'Product Updated',
        description: 'Samsung Galaxy S24 - SKU and pricing updated by Sarah Smith',
        time: '18 minutes ago',
        icon: 'edit',
        type: 'update',
      },
      {
        title: 'Supplier Added',
        description: 'Tech Wholesale Inc. registered as supplier by Admin',
        time: '1 hour ago',
        icon: 'check-circle',
        type: 'create',
      },
      {
        title: 'Brand Updated',
        description: 'Apple brand description and logo updated by Manager',
        time: '2 hours ago',
        icon: 'edit',
        type: 'update',
      },
      {
        title: 'Warehouse Created',
        description: 'Warehouse-WH-004 added in North Region by Admin',
        time: '4 hours ago',
        icon: 'check-circle',
        type: 'create',
      },
    ]);
  }

  /**
   * Load chart data
   * TODO: Replace with API calls
   * API Endpoints:
   * - GET /api/configuration/charts/category-distribution
   * - GET /api/configuration/charts/top-suppliers
   */
  private loadChartData(): void {
    // Products distribution by category
    this.categoryDistribution.set([
      { name: 'Electronics & Gadgets', value: 142 },
      { name: 'Clothing & Apparel', value: 98 },
      { name: 'Food & Beverage', value: 87 },
      { name: 'Home & Kitchen', value: 76 },
      { name: 'Health & Beauty', value: 54 },
      { name: 'Sports & Outdoors', value: 30 },
    ]);

    // Top suppliers by product count
    this.suppliersByRegion.set([
      { name: 'Tech Wholesale Inc.', value: 142 },
      { name: 'Global Distributors Ltd.', value: 98 },
      { name: 'Premium Suppliers Co.', value: 87 },
      { name: 'Direct Import Partners', value: 60 },
      { name: 'Local Vendors Group', value: 45 },
      { name: 'Others', value: 55 },
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
