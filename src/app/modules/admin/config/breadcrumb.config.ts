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
 * Breadcrumb configuration for Admin module
 * Organized by features with parent-child structure
 */
export const ADMIN_BREADCRUMBS: ModuleBreadcrumbConfig = {
  // User Feature
  user: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Admin', url: '/admin' },
      { label: 'Users', url: '/admin/user/list' }
    ],
    pages: {
      list: [{ label: 'User List' }],
      create: [{ label: 'Create User' }],
      view: [{ label: 'View User' }],
      edit: [{ label: 'Edit User' }]
    }
  },

  // Dashboard Feature
  dashboard: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Admin', url: '/admin' }
    ],
    pages: {
      main: [{ label: 'Dashboard' }],
      analytics: [{ label: 'Analytics' }],
      reports: [{ label: 'Reports' }]
    }
  },

  // Add more features as needed
};
