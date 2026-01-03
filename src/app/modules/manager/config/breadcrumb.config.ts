import { Breadcrumb } from "@app/shared/components/page-header/page-header.component";

export interface FeatureBreadcrumbs {
  parent: Breadcrumb[];
  pages: {
    [pageType: string]: Breadcrumb[];
  };
}

export interface ModuleBreadcrumbConfig {
  [featureName: string]: FeatureBreadcrumbs;
}

/**
 * Breadcrumb configuration for Manager module
 * Organized by features with parent-child structure
 */
export const MANAGER_BREADCRUMBS: ModuleBreadcrumbConfig = {
  // Inventory Feature
  inventory: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Manager', url: '/manager' },
      { label: 'Inventory', url: '/manager/inventory/list' }
    ],
    pages: {
      list: [{ label: 'Inventory List' }],
      create: [{ label: 'Add Inventory' }],
      view: [{ label: 'View Inventory' }],
      edit: [{ label: 'Edit Inventory' }]
    }
  },

  // Employee Feature
  employee: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Manager', url: '/manager' },
      { label: 'Employee', url: '/manager/employee/list' }
    ],
    pages: {
      list: [{ label: 'Employee List' }],
      create: [{ label: 'Add Employee' }],
      view: [{ label: 'View Employee' }],
      edit: [{ label: 'Edit Employee' }],
      attendance: [{ label: 'Attendance' }]
    }
  },

  // Report Feature
  report: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Manager', url: '/manager' },
      { label: 'Reports', url: '/manager/report/list' }
    ],
    pages: {
      list: [{ label: 'Report List' }],
      sales: [{ label: 'Sales Report' }],
      inventory: [{ label: 'Inventory Report' }],
      purchase: [{ label: 'Purchase Report' }]
    }
  },

  // Add more features as needed
};
