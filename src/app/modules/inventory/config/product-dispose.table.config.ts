/*
      Product Dispose Table Config
      Defines the configuration for the Product Dispose list in the Inventory module
*/

import { TableConfig } from '@app/core/interfaces/table';

export const PRODUCT_DISPOSE_TABLE_CONFIG: TableConfig = {
    title: 'List Of Disposals',
    cardColumnsDesktop: 3,
    columns: [
        {
            source: 'dispose_no',
            label: 'Dispose No',
            width: '14%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'disposal_date',
            label: 'Disposal Date',
            width: '12%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'disposal_method',
            label: 'Method',
            width: '12%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'product_count',
            label: 'Items',
            width: '8%',
            alignment: 'center',
            filterable: true,
            column_type: 'number',
        },
        {
            source: 'total_dispose_quantity',
            label: 'Total Qty',
            width: '10%',
            alignment: 'center',
            filterable: true,
            column_type: 'number',
        },
        {
            source: 'total_dispose_value',
            label: 'Loss Value',
            width: '12%',
            alignment: 'left',
            filterable: true,
            column_type: 'currency',
            currency: 'BDT',
            locale: 'en-IN',
        },
        {
            source: 'status',
            label: 'Status',
            width: '12%',
            alignment: 'center',
            filterable: false,
            column_type: 'status',
            text_color: [
                { name: 'Submitted', color: '#2563EB', icon: 'info' },
                { name: 'Approved', color: '#109648', icon: 'check' },
                { name: 'Reversed', color: '#F59E0B', icon: 'warning' },
                { name: 'Rejected', color: '#DF2935', icon: 'close' },
                { name: 'Cancelled', color: '#6B7280', icon: 'stop' },
            ],
        },
        {
            label: 'Actions',
            width: '8%',
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
        message: 'No disposals found. Start by creating your first disposal.',
        addButtonText: 'Add New Disposal',
        addButtonUrl: '/inventory/product-dispose/create',
    },
};
