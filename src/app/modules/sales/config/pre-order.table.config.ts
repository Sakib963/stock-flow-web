/*
      Pre-Order Table Config
      Bookings for stock not yet held. Deliberately separate from ORDER_TABLE_CONFIG:
      a pre-order is not an order and must never appear in the order list.
*/

import { TableConfig } from '@app/core/interfaces/table';

export const PRE_ORDER_TABLE_CONFIG: TableConfig = {
    title: 'Pre-Orders',
    cardColumnsDesktop: 3,
    columns: [
        { source: 'preorder_no', label: 'Pre-Order', width: '14%', alignment: 'left', filterable: true, column_type: 'text' },
        { source: 'customer_name', label: 'Customer', width: '16%', alignment: 'left', filterable: true, column_type: 'text' },
        { source: 'item_count', label: 'Items', width: '7%', alignment: 'center', filterable: false, column_type: 'number' },
        { source: 'total_amount', label: 'Total', width: '11%', alignment: 'right', filterable: false, column_type: 'currency', currency: 'BDT', locale: 'en-IN' },
        { source: 'advance_paid', label: 'Advance', width: '11%', alignment: 'right', filterable: false, column_type: 'currency', currency: 'BDT', locale: 'en-IN' },
        { source: 'advance_due', label: 'Due', width: '11%', alignment: 'right', filterable: false, column_type: 'currency', currency: 'BDT', locale: 'en-IN' },
        {
            source: 'status',
            label: 'Status',
            width: '13%',
            alignment: 'center',
            filterable: false,
            column_type: 'status',
            // Reuses the order status palette so a booking reads consistently with
            // the rest of the app. 'Converted' is the pre-order-only terminal state.
            text_color: [
                { name: 'Pending', color: '#FA8C16', icon: 'clock-circle' },
                { name: 'Confirmed', color: '#1677FF', icon: 'check-circle' },
                { name: 'Converted', color: '#109648', icon: 'swap' },
                { name: 'Cancelled', color: '#DF2935', icon: 'close-circle' },
            ],
        },
        { source: 'expected_date', label: 'Expected', width: '10%', alignment: 'left', filterable: false, column_type: 'date', dateFormat: 'dd/MM/yyyy' },
        {
            label: 'Actions',
            width: '7%',
            alignment: 'right',
            column_type: 'action',
            actions: [
                { action: 'view', label: 'View', icon: 'eye' },
                { action: 'edit', label: 'Edit', icon: 'edit' },
            ],
        },
    ],
    pageSizeOptions: [10, 20, 30, 50],
    defaultPageSize: 10,
    noData: {
        message: 'No pre-orders yet. Book one when a customer wants a product you do not have in stock.',
        addButtonText: 'New Pre-Order',
        addButtonUrl: '/sales/pre-order/create',
    },
};
