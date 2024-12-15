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
      group: 'Manager',
      items: [
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Dashboard',
          route: '/',
        },
        {
          icon: 'assets/icons/category.svg',
          label: 'Category',
          route: '/category',
        },
      ],
    },
  ];

  static defaultPages: MenuItem[] = [
    {
      group: 'Default',
      items: [
        {
          icon: 'assets/icons/help.svg',
          label: 'Help',
          route: '/help',
        },
      ],
    },
  ];
}
