/* 
      Supplier Table Config
      Defines the configuration for the Supplier table in the Configuration module
*/

import { TableConfig } from '@app/core/interfaces/table';

export const SUPPLIER_TABLE_CONFIG: TableConfig = {
  title: 'List Of Suppliers',
  cardColumnsDesktop: 3, // Number of columns in desktop card view
  columns: [
    {
      source: 'name',
      label: 'Supplier Name',
      width: '20%',
      alignment: 'left',
      filterable: true,
      column_type: 'text',
    },
    {
      source: 'phone',
      label: 'Phone Number',
      width: '13%',
      alignment: 'left',
      filterable: true,
      column_type: 'text',
    },
    {
      source: 'contact_person',
      label: 'Contact Person',
      width: '20%',
      alignment: 'left',
      filterable: true,
      column_type: 'text',
    },
    {
      source: 'email',
      label: 'Email Address',
      width: '15%',
      alignment: 'left',
      filterable: true,
      column_type: 'text',
    },
    {
      source: 'status',
      label: 'Status',
      width: '16%',
      alignment: 'center',
      filterable: false,
      column_type: 'status',
      text_color: [
        { name: 'Active', color: '#109648', icon: 'check' },
        { name: 'Inactive', color: '#DF2935', icon: 'close' },
      ],
    },
    {
      label: 'Actions',
      width: '16%',
      alignment: 'right',
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
      'No supplier found. Start by creating your first supplier to manage your supply chain effectively.',
    addButtonText: 'Add New Supplier',
    addButtonUrl: '/configuration/supplier/create',
  },
};
