/* 
      Brand Table Config
      Defines the configuration for the Brand table in the Configuration module
*/

import { TableConfig } from '@app/core/interfaces/table';

export const BRAND_TABLE_CONFIG: TableConfig = {
  title: 'List Of Brands',
  cardColumnsDesktop: 3, // Number of columns in desktop card view
  columns: [
    {
      source: 'name',
      label: 'Brand Name',
      width: '200px',
      sortable: true,
      filterable: true,
      column_type: 'text',
    },
    {
      source: 'description',
      label: 'Description',
      width: '300px',
      sortable: false,
      filterable: false,
      column_type: 'long-text',
    },
    {
      source: 'status',
      label: 'Status',
      width: '120px',
      sortable: true,
      filterable: false,
      column_type: 'text',
      text_color: [
        { name: 'Active', color: '#109648', icon: 'check' },
        { name: 'Inactive', color: '#DF2935', icon: 'close' },
      ],
    },
    {
      label: 'Actions',
      width: '120px',
      column_type: 'action',
      actions: [
        {
          action: 'view',
          label: 'View',
          icon: 'eye',
        },
        {
          action: 'edit',
          label: 'Edit',
          icon: 'edit',
        },
      ],
    },
  ],
  pageSizeOptions: [10, 20, 30, 50],
  defaultPageSize: 10,
  noData: {
    message:
      'No brand found. Start by creating your first brand to organize products effectively.',
    addButtonText: 'Add New Brand',
    addButtonUrl: '/configuration/brands/create',
  },
};
