import { MenuItem } from '../models/menu.model';

export class Menu {
  static adminPages: MenuItem[] = [
    {
      group: 'Admin',
      items: [
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Dashboard',
          route: '/',
        },
        {
          icon: 'assets/icons/user.svg',
          label: 'User',
          route: '/user',
        },
      ],
    },
  ];

  static publicPages: MenuItem[] = [
    {
      items: [
        {
          icon: 'assets/icons/heroicons/outline/home.svg',
          label: 'Home',
          route: '/',
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
