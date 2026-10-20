export type ReportGroup = 'sales' | 'stock' | 'customer' | 'marketing';

/** How a column's value is drawn. The coded types are stored codes the screen translates. */
export type ReportColumnType = 'text' | 'code' | 'day' | 'int' | 'money' | 'percent' | 'channel' | 'payment_method' | 'payment_type' | 'payment_status' | 'purchase_payment' | 'return_reason' | 'batch_status' | 'dispose_reason' | 'adjustment_reason' | 'yes_no' | 'courier' | 'gender' | 'age_band' | 'customer_status' | 'campaign_status' | 'pre_order_status';

export interface ReportColumn {
    key: string;
    /** The English label the spreadsheet prints; the screen uses its own copy. */
    label: string;
    type: ReportColumnType;
    total: boolean;
}

export type ReportRow = Readonly<Record<string, string | number | boolean | null>>;

export interface ReportResult {
    title: string;
    period: { date_from: string; date_to: string } | null;
    /** Only the columns this person may see: cost columns are absent, not empty, without stock value access. */
    columns: ReportColumn[];
    totals: Readonly<Record<string, number | null>>;
    rows: ReportRow[];
    /** Every row the report has; the screen is sent one page of them. */
    row_count: number;
}

export type ReportFilter = 'period' | 'channel' | 'category' | 'warehouse' | 'supplier' | 'dispose-reason' | 'adjustment-reason' | 'expires-by' | 'customer-status' | 'gender' | 'age-band' | 'quiet-days' | 'campaign-status';

export interface ReportDefinition {
    key: string;
    icon: string;
    filters: readonly ReportFilter[];
    /** The whole report needs this permission, not only some of its columns. */
    requires?: string;
    /** Columns the screen opens without, picked back from Columns; Excel and print keep every column. */
    hidden?: readonly string[];
    /** Totals shown above the rows beside the column totals, such as a count of sales. */
    extraTotals?: readonly string[];
}

export type ReportQuery = Readonly<Record<string, string | null>>;
