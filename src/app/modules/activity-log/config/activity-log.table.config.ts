import { TableConfig } from '@app/core/interfaces/table';

export const ACTIVITY_LOG_TABLE_CONFIG: TableConfig = {
    title: 'All Activities',
    cardColumnsDesktop: 4,
    columns: [
        {
            source: 'title',
            label: 'Title',
            width: '15%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'performed_on_display',
            label: 'Time',
            width: '10%',
            alignment: 'left',
            filterable: false,
            column_type: 'text',
        },
        {
            source: 'feature_label',
            label: 'Feature',
            width: '15%',
            alignment: 'left',
            filterable: true,
            column_type: 'text',
        },
        {
            source: 'description',
            label: 'Description',
            width: '45%',
            alignment: 'left',
            filterable: false,
            column_type: 'long-text',
        },
        {
            source: 'performed_by',
            label: 'Performed By',
            width: '15%',
            alignment: 'left',
            filterable: false,
            column_type: 'text',
        },
    ],
    pageSizeOptions: [10, 20, 50, 100],
    defaultPageSize: 20,
    noData: {
        message: 'No activity logs found for selected filters.',
    },
};
