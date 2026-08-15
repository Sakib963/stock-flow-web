/*
      Order Table Config — unified list of POS + online orders.
*/
import { TableConfig } from '@app/core/interfaces/table';

export const ORDER_TABLE_CONFIG: TableConfig = {
    title: 'Orders',
    cardColumnsDesktop: 3,
    columns: [
        { source: 'invoice_no', label: 'Order', width: '14%', alignment: 'left', filterable: true, column_type: 'text' },
        { source: 'channel', label: 'Channel', width: '10%', alignment: 'left', filterable: false, column_type: 'text' },
        { source: 'customer_name', label: 'Customer', width: '18%', alignment: 'left', filterable: true, column_type: 'text' },
        { source: 'total_amount', label: 'Total', width: '12%', alignment: 'right', filterable: false, column_type: 'currency', currency: 'BDT', locale: 'en-IN' },
        { source: 'item_count', label: 'Items', width: '8%', alignment: 'center', filterable: false, column_type: 'number' },
        {
            source: 'status',
            label: 'Status',
            width: '16%',
            alignment: 'center',
            filterable: false,
            column_type: 'status',
            text_color: [
                { name: 'Draft', color: '#8C8C8C', icon: 'edit' },
                { name: 'Pending', color: '#FA8C16', icon: 'clock-circle' },
                { name: 'Confirmed', color: '#1677FF', icon: 'check-circle' },
                { name: 'Purchased', color: '#109648', icon: 'check' },
                { name: 'Delivered', color: '#109648', icon: 'check-circle' },
                { name: 'PartiallyReturned', color: '#D48806', icon: 'rollback' },
                { name: 'Returned', color: '#DF2935', icon: 'rollback' },
                { name: 'Cancelled', color: '#DF2935', icon: 'close-circle' },
                { name: 'Refunded', color: '#DF2935', icon: 'dollar' },
            ],
        },
        { source: 'created_on', label: 'Date', width: '14%', alignment: 'left', filterable: false, column_type: 'date', dateFormat: 'dd/MM/yyyy hh:mm a' },
        {
            label: 'Actions',
            width: '10%',
            alignment: 'right',
            column_type: 'action',
            actions: [{ action: 'view', label: 'View', icon: 'eye' }],
        },
    ],
    pageSizeOptions: [10, 20, 30, 50],
    defaultPageSize: 10,
    noData: {
        message: 'No orders yet. Create a POS sale or an online order to get started.',
        addButtonText: 'New Order',
        addButtonUrl: '/sales/online',
    },
};
