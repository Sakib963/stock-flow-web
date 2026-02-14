/* 
      Product Table Config
      Defines the configuration for the Product table in the Configuration module
*/

import { TableConfig } from '@app/core/interfaces/table';

export const PRODUCT_TABLE_CONFIG: TableConfig = {
    title: 'List Of Products',
    cardColumnsDesktop: 3, // Number of columns in desktop card view
    columns: [
        {
            source: 'name',
            label: 'Product Name',
            width: '20%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'sku',
            label: 'SKU',
            width: '15%',
            alignment: 'left',
            filterable: false,
            column_type: 'text',
        },
        {
            source: 'category_name',
            label: 'Category',
            width: '15%',
            alignment: 'left',
            filterable: false,
            column_type: 'text',
        },
        {
            source: 'sub_category_name',
            label: 'Sub Category',
            width: '15%',
            alignment: 'left',
            filterable: false,
            column_type: 'text',
        },
        {
            source: 'brand_name',
            label: 'Brand',
            width: '15%',
            alignment: 'left',
            filterable: false,
            column_type: 'text',
        },
        {
            source: 'status',
            label: 'Status',
            width: '10%',
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
            width: '10%',
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
                {
                    action: 'delete',
                    label: 'Delete',
                    icon: 'delete',
                },
            ],
        },
    ],
    pageSizeOptions: [10, 20, 30, 50],
    defaultPageSize: 10,
    noData: {
        message: 'No products found. Start by creating your first product.',
        addButtonText: 'Add New Product',
        addButtonUrl: '/configuration/product/create',
    },
};
