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
 * Breadcrumb configuration for Configuration module
 * Organized by features with parent-child structure
 */
export const CONFIGURATION_BREADCRUMBS: ModuleBreadcrumbConfig = {
  // Dashboard Feature - Module landing page
  dashboard: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Configuration', url: '/configuration/stats' }
    ],
    pages: {
      main: [], // No additional breadcrumb - stays at 2 levels
    }
  },

  // Fix Issues Feature
  'fix-issues': {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Configuration', url: '/configuration/stats' }
    ],
    pages: {
      main: [{ label: 'Fix Issues', url: '/configuration/fix-issues' }],
    }
  },

  // Category Feature
  category: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Configuration', url: '/configuration/stats' },
      { label: 'Category', url: '/configuration/category/list' }
    ],
    pages: {
      list: [{ label: 'List', url: '/configuration/category/list' }],
      create: [{ label: 'Create' }],
      view: [{ label: 'View' }],
      edit: [{ label: 'Edit' }]
    }
  },

  // Aisle Feature
  aisle: {
    parent: [
      { label: 'Home', url: '/', icon: 'home' },
      { label: 'Configuration', url: '/configuration/stats' },
      { label: 'Aisle' }
    ],
    pages: {
      list: [{ label: 'List', url: '/configuration/aisle/list' }],
      create: [{ label: 'Create' }],
      view: [{ label: 'View' }],
      edit: [{ label: 'Edit' }]
    }
  },

  // Add more features as needed
  // product: { parent: [...], pages: {...} },
  // supplier: { parent: [...], pages: {...} },
};