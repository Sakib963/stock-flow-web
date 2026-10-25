import { Action, Text } from '@app/core/models/config.model';

export interface PageAction extends Action {
    primary?: boolean;
}

export interface Crumb {
    label: Text;
    route?: string;
}

/** Where the header's Back button goes: always a fixed place, so its label names it. A page that is not under a list names its own place. */
export interface PageBack {
    route: string;
    /** Default: Back to list. */
    label?: string;
}

export interface PageHeaderConfig {
    /** Default: the feature's menu label. */
    title?: Text;
    /** Default: the feature's menu description. */
    lead?: Text;
    /** Default 'menu': the feature's path in the menu. */
    breadcrumb?: 'menu' | readonly Crumb[] | false;
    /** Record and form pages. */
    back?: PageBack;
    /** The row total beside the title. */
    count?: boolean;
    /** At most two visible, exactly one primary. */
    actions?: readonly PageAction[];
}
