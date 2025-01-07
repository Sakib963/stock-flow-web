import { MenuItem } from '../models/menu.model';

export class Menu {
  static adminPages: MenuItem[] = [
    {
      group: 'Admin',
      items: [
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Dashboard',
          route: '/admin/dashboard',
        },
        {
          icon: 'assets/icons/user.svg',
          label: 'User',
          route: '/admin/user',
        },
      ],
    },
  ];

  static managerPages: MenuItem[] = [
    {
      group: 'Dashboard',
      items: [
        { icon: 'assets/icons/dashboard.svg', label: 'Dashboard', route: '/' },
      ],
    },
    {
      group: 'Configuration',
      items: [
        { icon: 'assets/icons/category.svg', label: 'Category', route: '/category' },
        { icon: 'assets/icons/product.svg', label: 'Product', route: '/product' },
      ],
    },
  ];

  static menuItems: MenuItem[] = [
    {
      group: 'Dashboard',
      items: [
        { icon: 'assets/icons/dashboard.svg', label: 'Dashboard', route: '/' },
      ],
    },
    {
      group: 'Services',
      items: [
        { icon: 'assets/icons/dashboard.svg', label: 'Agency', route: '/services/agency' },
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Portfolio',
          route: '/services/portfolio',
        },
        { icon: 'assets/icons/dashboard.svg', label: 'Assets', route: '/services/assets' },
      ],
    },
    {
      group: 'Tech',
      items: [
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Artificial Intelligence',
          route: '/tech/ai',
        },
        { icon: 'assets/icons/dashboard.svg', label: 'Tech', route: '/tech/tech' },
        { icon: 'assets/icons/dashboard.svg', label: 'Web3', route: '/tech/web3' },
      ],
    },
    {
      group: 'Tools',
      items: [
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Design Tools',
          route: '/tools/design',
        },
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Development Tools',
          route: '/tools/dev',
        },
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Marketing',
          route: '/tools/marketing',
        },
        {
          icon: 'productivity-icon',
          label: 'Productivity',
          route: '/tools/productivity',
        },
      ],
    },
    {
      group: 'Money',
      items: [
        {
          icon: 'ecommerce-icon',
          label: 'E-commerce',
          route: '/money/ecommerce',
        },
        { icon: 'finance-icon', label: 'Finance', route: '/money/finance' },
      ],
    },
    {
      group: 'Apps',
      items: [
        { icon: 'web-apps-icon', label: 'Web Apps', route: '/apps/web' },
        {
          icon: 'desktop-apps-icon',
          label: 'Desktop Apps',
          route: '/apps/desktop',
        },
        {
          icon: 'mobile-apps-icon',
          label: 'Mobile Apps',
          route: '/apps/mobile',
        },
      ],
    },
  ];
}
