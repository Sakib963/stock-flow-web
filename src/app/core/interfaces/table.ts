/* 
      Defines the structure of a table column.
      Used for configuring tables in various modules.
*/

export interface TableColumn {
  source?: string; // Data source field
  label: string; // Column header label
  width?: string; // Column width (e.g., '150px', '20%', 'auto')
  sortable?: boolean; // Is the column sortable
  filterable?: boolean; // Is the column filterable
  column_type?:
    | 'text'
    | 'long-text'
    | 'number'
    | 'date'
    | 'boolean'
    | 'status'
    | 'action'; // Data type
  dateFormat?: string; // Date format if column_type is 'date'
  text_color?: { name: string; color: string }[]; // Text color mapping based on cell value
  actions?: TableAction[]; // Actions for 'action' column type
}

export interface TableConfig {
  title: string; // Table title
  columns: TableColumn[]; // Array of table columns
  pageSizeOptions: number[]; // Options for page size
  defaultPageSize: number; // Default page size
  cardColumnsDesktop?: number; // Number of columns for card view in desktop (default: 3)
  noData: {
    message?: string; // Message to show when no data is available
    addButtonText?: string; // Text for add  button
    addButtonUrl?: string; // URL for add  button
  };
}

// Define Action Array
export interface TableAction {
  action: string; // Action name
  label: string; // Action label
  icon?: string; // Action icon
}
