import { Condition, Text, Tone } from '@app/core/models/config.model';
import { FilterConfig, FilterValues } from '@app/core/models/filter.model';
import { PageHeaderConfig } from '@app/core/models/page-header.model';
import { RendererRef } from '@app/core/models/renderer.model';
import { TableConfig, TableSource } from '@app/core/models/table.model';

export interface Stat {
    key: string;
    label: Text;
    icon: string;
    format?: 'number' | 'money';
    tone?: Tone;
    /** Applied when the card is clicked. */
    filter?: FilterValues;
    permission?: string;
}

export interface Slot extends RendererRef {
    place: 'below-header' | 'above-table' | 'aside';
    permission?: string;
    when?: Condition;
}

export interface ListShellPageConfig {
    /** The view code, equal to the route's. */
    permission: string;
    header: PageHeaderConfig;
    stats?: readonly Stat[];
    filter?: FilterConfig;
    /** A list shell page always loads. */
    table: TableConfig & { source: TableSource };
    slots?: readonly Slot[];
}
