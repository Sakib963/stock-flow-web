import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePackage, lucideShoppingCart, lucideTruck, lucideUndo2, lucideUsers } from '@ng-icons/lucide';
import { AppNotification, NotificationCategory } from '@app/core/models/notification.model';
import { NotificationDay } from '@app/core/models/shell.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { NotificationService } from '@app/core/services/notification/notification.service';
import { BadgeComponent } from '@app/layout/components/badge/badge.component';

/** Which lucide icon stands for each kind of alert. Registered in the provider list below. */
export const NOTIFICATION_ICON: Record<NotificationCategory, string> = {
    order: 'lucideShoppingCart',
    dispatch: 'lucideTruck',
    stock: 'lucidePackage',
    return: 'lucideUndo2',
    staff: 'lucideUsers',
};

/**
 * The tinted square behind each alert's icon, by category.
 *
 * Colour by urgency, from the status tokens the rest of the app already uses. The icon is what
 * separates one category from another; the tint says how much it matters. Beside the icon map for
 * the same reason it exists: the category is a runtime value, so the template cannot name the
 * class and something has to hold the mapping.
 */
export const CATEGORY_TONE: Record<NotificationCategory, string> = {
    order: 'bg-primary-wash text-primary',
    dispatch: 'bg-[#e6f6f4] text-[#0b5c55]',
    stock: 'bg-warning-bg text-[#b06d0c]',
    return: 'bg-success-bg text-success',
    staff: 'bg-surface-page text-ink-soft',
};

const DAY = 86_400_000;

/** The notifications panel: the body of the right-hand drawer, at every width. */
@Component({
    selector: 'notification-panel',
    imports: [TranslatePipe, NgIcon, BadgeComponent],
    providers: [provideIcons({ lucidePackage, lucideShoppingCart, lucideTruck, lucideUndo2, lucideUsers })],
    // The host draws no box of its own, so the panel fills the drawer body it is stamped into.
    host: { class: 'contents' },
    templateUrl: './notification-panel.component.html',
    styleUrl: './notification-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationPanelComponent {
    readonly notifications = inject(NotificationService);
    readonly language = inject(LanguageService);

    readonly categoryIcon = NOTIFICATION_ICON;
    readonly categoryTone = CATEGORY_TONE;

    /**
     * Alerts grouped by the day they arrived, newest first.
     *
     * Today and Yesterday are named because that is how someone thinks about an alert they have
     * not dealt with yet; anything older is a date, because "4 days ago" stops being countable.
     */
    readonly days = computed<NotificationDay[]>(() => {
        const locale = this.language.current() === 'bn' ? 'bn-BD' : 'en-GB';
        const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const today = midnight(new Date());
        const days: NotificationDay[] = [];

        for (const item of [...this.notifications.items()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
            const at = new Date(item.createdAt);
            const bucket = midnight(at);
            const id = String(bucket);

            let day = days.find((d) => d.id === id);
            if (!day) {
                const named = bucket === today ? 'shell.today' : bucket === today - DAY ? 'shell.yesterday' : null;
                day = { id, labelKey: named, label: named ? null : at.toLocaleDateString(locale, { day: 'numeric', month: 'short' }), rows: [] };
                days.push(day);
            }
            day.rows.push({ item, time: at.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) });
        }
        return days;
    });

    /** Opening one is reading it, the same as opening an email. */
    onNotification(item: AppNotification): void {
        this.notifications.markRead(item.id);
    }

    title(item: AppNotification): string {
        return this.language.current() === 'bn' ? item.title.bn || item.title.en : item.title.en;
    }

    body(item: AppNotification): string {
        return this.language.current() === 'bn' ? item.body.bn || item.body.en : item.body.en;
    }
}
