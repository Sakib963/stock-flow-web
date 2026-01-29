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
            width: '20%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'description',
            label: 'Description',
            width: '50%',
            alignment: 'left',
            filterable: false,
            column_type: 'long-text',
        },
        {
            source: 'status',
            label: 'Status',
            width: '15%',
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
            width: '15%',
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
        message: 'No brand found. Start by creating your first brand to organize products effectively.',
        addButtonText: 'Add New Brand',
        addButtonUrl: '/configuration/brands/create',
    },
};
