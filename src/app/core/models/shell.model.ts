import { MenuItem } from '@app/core/models/session.model';
import { AppNotification } from '@app/core/models/notification.model';

/** Which header overlay is showing. Only ever one, so this is a value rather than a flag each. */
export type HeaderPanel = 'search' | 'notifications' | 'account';

/** A section of the search panel, already numbered so arrow keys can address a row by index. */
export interface SearchGroup {
    id: string;
    /** A menu section name, already in the current language. */
    label: string | null;
    /** For the sections the menu cannot name: resolved through i18n in the template. */
    labelKey: string | null;
    count: number;
    rows: { item: MenuItem; index: number }[];
}

/** The unnumbered form, before the panel assigns each row its place in the keyboard order. */
export interface RawSearchGroup {
    id: string;
    label: string | null;
    labelKey: string | null;
    items: MenuItem[];
}

/** One day of alerts. `labelKey` for Today and Yesterday, `label` for a formatted date. */
export interface NotificationDay {
    id: string;
    label: string | null;
    labelKey: string | null;
    rows: { item: AppNotification; time: string }[];
}
