/* 
      Category Table Config
      Defines the configuration for the Category table in the Configuration module
*/

import { TableConfig } from '@app/core/interfaces/table';

export const CATEGORY_TABLE_CONFIG: TableConfig = {
  title: 'List Of Categories',
  cardColumnsDesktop: 3, // Number of columns in desktop card view
  columns: [
    {
      source: 'name',
      label: 'Category Name',
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
      source: 'category_code',
      label: 'Code',
      width: '150px',
      sortable: true,
      filterable: false,
      column_type: 'text',
    },
    {
      source: 'status',
      label: 'Status',
      width: '120px',
      sortable: true,
      filterable: false,
      column_type: 'text',
      text_color: [
        { name: 'Active', color: 'success' },
        { name: 'Inactive', color: 'error' },
        { name: 'Pending', color: 'warning' },
        { name: 'Draft', color: 'default' },
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
      'No categories found. Start by creating your first category to organize products effectively.',
    addButtonText: 'Add New Category',
    addButtonUrl: '/configuration/category/create',
  },
};
