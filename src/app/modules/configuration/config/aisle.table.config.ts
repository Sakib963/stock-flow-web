/*
      Aisle Table Config
      Defines the configuration for the Aisle table in the Configuration module
*/

import { TableConfig } from '@app/core/interfaces/table';

export const AISLE_TABLE_CONFIG: TableConfig = {
    title: 'List Of Aisles',
    cardColumnsDesktop: 3, // Number of columns in desktop card view
    columns: [
        {
            source: 'name',
            label: 'Aisle Name',
            width: '20%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'code',
            label: 'Aisle Code',
            width: '15%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'warehouse_name',
            label: 'Warehouse',
            width: '20%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'capacity',
            label: 'Capacity',
            width: '10%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
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
        message: 'No aisle found. Start by creating your first aisle to organize inventory within warehouses.',
        addButtonText: 'Add New Aisle',
        addButtonUrl: '/configuration/aisle/create',
    },
};
