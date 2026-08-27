/*
      Return Table Config
      Customer returns raised against a realized order. A return is Pending until
      someone confirms it, which is the only point stock actually moves, so the
      Pending status is styled to read as "needs action" rather than as a state.
*/

import { TableConfig } from '@app/core/interfaces/table';

export const RETURN_TABLE_CONFIG: TableConfig = {
    title: 'Returns',
    cardColumnsDesktop: 3,
    columns: [
        { source: 'return_no', label: 'Return', width: '15%', alignment: 'left', filterable: true, column_type: 'text' },
        { source: 'invoice_no', label: 'Order', width: '12%', alignment: 'left', filterable: true, column_type: 'text' },
        { source: 'customer_name', label: 'Customer', width: '16%', alignment: 'left', filterable: true, column_type: 'text' },
        { source: 'units', label: 'Units', width: '7%', alignment: 'center', filterable: false, column_type: 'number' },
        { source: 'refund_amount', label: 'Refund', width: '12%', alignment: 'right', filterable: false, column_type: 'currency', currency: 'BDT', locale: 'en-IN' },
        {
            source: 'status',
            label: 'Status',
            width: '13%',
            alignment: 'center',
            filterable: false,
            column_type: 'status',
            text_color: [
                { name: 'Pending', color: '#FA8C16', icon: 'clock-circle' },
                { name: 'Returned', color: '#1677FF', icon: 'rollback' },
                { name: 'Completed', color: '#109648', icon: 'check-circle' },
                { name: 'Cancelled', color: '#DF2935', icon: 'close-circle' },
            ],
        },
        { source: 'created_on', label: 'Date', width: '14%', alignment: 'left', filterable: false, column_type: 'date', dateFormat: 'dd/MM/yyyy hh:mm a' },
        {
            label: 'Actions',
            width: '7%',
            alignment: 'right',
            column_type: 'action',
            actions: [{ action: 'view', label: 'View', icon: 'eye' }],
        },
    ],
    pageSizeOptions: [10, 20, 30, 50],
    defaultPageSize: 10,
    noData: {
        // No create button: a return always starts from the order it belongs to.
        message: 'No returns yet. Open a completed order and use its Return action to record one.',
        addButtonText: 'Go to Orders',
        addButtonUrl: '/sales/orders/list',
    },
};

// The Channel column is only meaningful for a shop that runs both POS and online,
// so the list page splices it in rather than carrying it here permanently.
export const RETURN_CHANNEL_COLUMN = {
    source: 'channel',
    label: 'Channel',
    width: '10%',
    alignment: 'center' as const,
    filterable: false,
    column_type: 'status' as const,
    text_color: [
        { name: 'POS', color: '#109648', icon: 'shop' },
        { name: 'ONLINE', color: '#1677FF', icon: 'global' },
    ],
};
