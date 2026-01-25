/* 
      Category Table Config
      Defines the configuration for the Category table in the Configuration module
*/

import { TableConfig } from '@app/core/interfaces/table';

export const SUB_CATEGORY_TABLE_CONFIG: TableConfig = {
  title: 'List Of Sub Categories',
  cardColumnsDesktop: 3, // Number of columns in desktop card view
  columns: [
    {
      source: 'name',
      label: 'Sub Category Name',
      width: '200px',
      sortable: true,
      filterable: true,
      column_type: 'text',
    },
    {
      source: 'description',
      label: 'Description',
      width: '200px',
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
      source: 'category_name',
      label: 'Category Name',
      width: '200px',
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
      'No sub categories found. Start by creating your first sub category to organize products effectively.',
    addButtonText: 'Add New Sub Category',
    addButtonUrl: '/configuration/sub-category/create',
  },
};
