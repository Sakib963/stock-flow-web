import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { getBreadcrumbsByKey } from '@app/core/config/breadcrumb.registry';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';

interface DataQualityIssue {
  oid: number;
  sku?: string;
  name: string;
  category?: string;
  brand?: string;
  issueType: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  actionUrl: string;
}

interface IssueCategory {
  type: string;
  label: string;
  icon: string;
  color: string;
  count: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  issues: DataQualityIssue[];
}

@Component({
  selector: 'app-fix-issues',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgZorroCustomModule,
    PageHeaderComponent,
    LoaderComponent,
  ],
  templateUrl: './fix-issues.component.html',
  styleUrls: ['./fix-issues.component.scss'],
})
export class FixIssuesComponent implements OnInit {
  breadcrumbs = getBreadcrumbsByKey('configuration.fix-issues');

  // Signals
  loading = signal(true);
  issueCategories = signal<IssueCategory[]>([]);
  selectedCategory = signal<string>('all');
  totalIssues = signal(0);
  criticalIssues = signal(0);
  highIssues = signal(0);

  ngOnInit(): void {
    this.loadDataQualityIssues();
  }

  /**
   * Load all data quality issues
   * TODO: Replace with API call
   * API: GET /api/configuration/data-quality/issues
   */
  private loadDataQualityIssues(): void {
    setTimeout(() => {
      const categories: IssueCategory[] = [
        {
          type: 'missing_images',
          label: 'Products Missing Images',
          icon: 'picture',
          color: '#FA8C16',
          count: 24,
          priority: 'high',
          issues: this.getMockIssues('Missing Image', 24),
        },
        {
          type: 'missing_brands',
          label: 'Products Without Brands',
          icon: 'flag',
          color: '#F5222D',
          count: 36,
          priority: 'high',
          issues: this.getMockIssues('Missing Brand', 36),
        },
        {
          type: 'missing_categories',
          label: 'Products Without Categories',
          icon: 'appstore',
          color: '#CF1322',
          count: 8,
          priority: 'critical',
          issues: this.getMockIssues('Missing Category', 8),
        },
        {
          type: 'missing_suppliers',
          label: 'Products Without Suppliers',
          icon: 'team',
          color: '#FA541C',
          count: 12,
          priority: 'high',
          issues: this.getMockIssues('Missing Supplier', 12),
        },
        {
          type: 'empty_categories',
          label: 'Empty Categories',
          icon: 'inbox',
          color: '#FAAD14',
          count: 5,
          priority: 'low',
          issues: this.getMockEmptyCategories(),
        },
        {
          type: 'empty_brands',
          label: 'Empty Brands',
          icon: 'delete',
          color: '#FFA940',
          count: 8,
          priority: 'low',
          issues: this.getMockEmptyBrands(),
        },
        {
          type: 'inactive_suppliers',
          label: 'Inactive Suppliers',
          icon: 'stop',
          color: '#8C8C8C',
          count: 3,
          priority: 'medium',
          issues: this.getMockInactiveSuppliers(),
        },
      ];

      this.issueCategories.set(categories);
      this.totalIssues.set(categories.reduce((sum, cat) => sum + cat.count, 0));
      this.criticalIssues.set(
        categories.filter((c) => c.priority === 'critical').reduce((sum, cat) => sum + cat.count, 0)
      );
      this.highIssues.set(
        categories.filter((c) => c.priority === 'high').reduce((sum, cat) => sum + cat.count, 0)
      );
      this.loading.set(false);
    }, 600);
  }

  /**
   * Get mock product issues
   * TODO: Replace with actual API data
   */
  private getMockIssues(issueType: string, count: number): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];
    for (let i = 1; i <= Math.min(count, 10); i++) {
      issues.push({
        oid: 1000 + i,
        sku: `SKU-${1000 + i}`,
        name: `Product ${i} - ${issueType}`,
        category: i % 2 === 0 ? 'Electronics' : 'Clothing',
        brand: i % 3 === 0 ? undefined : 'Sample Brand',
        issueType: issueType,
        priority: issueType.includes('Category') ? 'critical' : 'high',
        description: `This product is missing ${issueType.toLowerCase()}`,
        actionUrl: `/configuration/product/edit/${1000 + i}`,
      });
    }
    return issues;
  }

  /**
   * Get mock empty categories
   */
  private getMockEmptyCategories(): DataQualityIssue[] {
    return [
      {
        oid: 1,
        name: 'Outdated Electronics',
        issueType: 'Empty Category',
        priority: 'low',
        description: 'Category has no products assigned',
        actionUrl: '/configuration/category/edit/1',
      },
      {
        oid: 2,
        name: 'Discontinued Items',
        issueType: 'Empty Category',
        priority: 'low',
        description: 'Category has no products assigned',
        actionUrl: '/configuration/category/edit/2',
      },
      {
        oid: 3,
        name: 'Seasonal Products',
        issueType: 'Empty Category',
        priority: 'low',
        description: 'Category has no products assigned',
        actionUrl: '/configuration/category/edit/3',
      },
      {
        oid: 4,
        name: 'Test Category',
        issueType: 'Empty Category',
        priority: 'low',
        description: 'Category has no products assigned',
        actionUrl: '/configuration/category/edit/4',
      },
      {
        oid: 5,
        name: 'Promotional Items',
        issueType: 'Empty Category',
        priority: 'low',
        description: 'Category has no products assigned',
        actionUrl: '/configuration/category/edit/5',
      },
    ];
  }

  /**
   * Get mock empty brands
   */
  private getMockEmptyBrands(): DataQualityIssue[] {
    return [
      {
        oid: 1,
        name: 'Old Brand Co.',
        issueType: 'Empty Brand',
        priority: 'low',
        description: 'Brand has no products assigned',
        actionUrl: '/configuration/brands/edit/1',
      },
      {
        oid: 2,
        name: 'Discontinued Brand',
        issueType: 'Empty Brand',
        priority: 'low',
        description: 'Brand has no products assigned',
        actionUrl: '/configuration/brands/edit/2',
      },
      {
        oid: 3,
        name: 'Test Brand',
        issueType: 'Empty Brand',
        priority: 'low',
        description: 'Brand has no products assigned',
        actionUrl: '/configuration/brands/edit/3',
      },
    ];
  }

  /**
   * Get mock inactive suppliers
   */
  private getMockInactiveSuppliers(): DataQualityIssue[] {
    return [
      {
        oid: 1,
        name: 'Legacy Supplier Ltd.',
        issueType: 'Inactive Supplier',
        priority: 'medium',
        description: 'Supplier is marked as inactive',
        actionUrl: '/configuration/supplier/edit/1',
      },
      {
        oid: 2,
        name: 'Old Vendor Co.',
        issueType: 'Inactive Supplier',
        priority: 'medium',
        description: 'Supplier is marked as inactive',
        actionUrl: '/configuration/supplier/edit/2',
      },
      {
        oid: 3,
        name: 'Discontinued Supplier',
        issueType: 'Inactive Supplier',
        priority: 'medium',
        description: 'Supplier is marked as inactive',
        actionUrl: '/configuration/supplier/edit/3',
      },
    ];
  }

  /**
   * Filter issues by category
   */
  filterByCategory(categoryType: string): void {
    this.selectedCategory.set(categoryType);
  }

  /**
   * Get filtered categories based on selection
   */
  getFilteredCategories(): IssueCategory[] {
    const selected = this.selectedCategory();
    if (selected === 'all') {
      return this.issueCategories();
    }
    return this.issueCategories().filter((cat) => cat.type === selected);
  }

  /**
   * Get priority badge color
   */
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical':
        return '#CF1322';
      case 'high':
        return '#F5222D';
      case 'medium':
        return '#FA8C16';
      case 'low':
        return '#FAAD14';
      default:
        return '#8C8C8C';
    }
  }

  /**
   * Get priority label
   */
  getPriorityLabel(priority: string): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  /**
   * Bulk fix action
   */
  bulkFixIssues(categoryType: string): void {
    console.log('Bulk fixing issues for:', categoryType);
    // TODO: Implement bulk fix functionality
    // This could open a modal for bulk operations
  }

  /**
   * Export issues to CSV
   */
  exportIssues(): void {
    console.log('Exporting issues to CSV');
    // TODO: Implement CSV export
  }
}
