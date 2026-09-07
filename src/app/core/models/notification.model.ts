import { Localised } from '@app/core/models/session.model';

/**
 * An operational alert in the header bell.
 *
 * Written to the shapes of alert this business actually generates rather than a generic
 * "notification": each category is a thing somebody has to go and do.
 */
export type NotificationCategory =
    /** An order cannot move until somebody chases a detail, usually an address. */
    | 'order'
    /** Confirmed orders are waiting for a courier export. */
    | 'dispatch'
    /** A product has reached its reorder point, more urgent while orders hold units against it. */
    | 'stock'
    /** Goods are back and waiting to be marked good or damaged. */
    | 'return'
    /** An attendance event a manager should see. */
    | 'staff';

export interface AppNotification {
    id: string;
    category: NotificationCategory;
    title: Localised;
    /** One line of context. The panel truncates it rather than wrapping to a paragraph. */
    body: Localised;
    /** ISO 8601. The panel groups by day and shows the time of day on the row. */
    createdAt: string;
    /** null while unread. A timestamp rather than a flag, so "when did they see it" survives. */
    readAt: string | null;
}
