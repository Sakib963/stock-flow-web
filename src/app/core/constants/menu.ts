import { MenuItem } from '../models/menu.model';

export class Menu {
  static pages: MenuItem[] = [
    {
      group: 'user',
      separator: false,
      items: [
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Application',
          route: '/dashboard',
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
}
