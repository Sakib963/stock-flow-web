/*
      Aisle Table Config
      Defines the configuration for the Aisle table in the Configuration module
*/

import { TableConfig } from '@app/core/interfaces/table';

export const PURCHASE_ORDER_TABLE_CONFIG: TableConfig = {
    title: 'List Of Purchase Orders',
    cardColumnsDesktop: 3,
    columns: [
        {
            source: 'total_amount',
            label: 'Total Amount',
            width: '10%',
            alignment: 'left',
            filterable: true,
            column_type: 'currency',
            currency: 'BDT',
            locale: 'en-IN',
        },
        {
            source: 'paid_amount',
            label: 'Paid Amount',
            width: '10%',
            alignment: 'left',
            filterable: true,
            column_type: 'currency',
            currency: 'BDT',
            locale: 'en-IN',
        },
        {
            source: 'payment_status',
            label: 'Payment Status',
            width: '10%',
            alignment: 'left',
            filterable: true,
            column_type: 'status',
            text_color: [
                { name: 'Paid', color: '#109648', icon: 'check' },
                { name: 'Partially Paid', color: '#F59E0B', icon: 'warning' },
                { name: 'Unpaid', color: '#DF2935', icon: 'close' },
            ],
        },
        {
            source: 'product_count',
            label: 'Total Products',
            width: '10%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'supplier_name',
            label: 'Supplier',
            width: '20%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'purchase_type',
            label: 'Purchase Type',
            width: '10%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'created_on',
            label: 'Purchase Date',
            width: '10%',
            alignment: 'left',
            filterable: true,
            column_type: 'date',
        },
        {
            source: 'status',
            label: 'Status',
            width: '10%',
            alignment: 'center',
            filterable: false,
            column_type: 'status',
            text_color: [
                { name: 'Submitted', color: '#2563EB', icon: 'info' }, // blue
                { name: 'Verified', color: '#109648', icon: 'check' },
                { name: 'Cancelled', color: '#DF2935', icon: 'close' },
            ],
        },
        {
            label: 'Actions',
            width: '5%',
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
        message: 'No purchase orders found. Start by creating your first purchase order.',
        addButtonText: 'Add New Purchase Order',
        addButtonUrl: '/inventory/purchase-order/create',
    },
};
