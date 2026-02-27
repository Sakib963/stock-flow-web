/*
      Warehouse Table Config
      Defines the configuration for the Warehouse table in the Configuration module
*/

import { TableConfig } from '@app/core/interfaces/table';

export const WAREHOUSE_TABLE_CONFIG: TableConfig = {
    title: 'List Of Warehouses',
    cardColumnsDesktop: 3, // Number of columns in desktop card view
    columns: [
        {
            source: 'name',
            label: 'Warehouse Name',
            width: '20%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'code',
            label: 'Warehouse Code',
            width: '15%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'location',
            label: 'Location',
            width: '15%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'capacity',
            label: 'Capacity',
            width: '15%',
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
        message: 'No warehouse found. Start by creating your first warehouse to organize products effectively.',
        addButtonText: 'Add New Warehouse',
        addButtonUrl: '/configuration/warehouse/create',
    },
};
