import { Injectable, computed, signal } from '@angular/core';
import { AppNotification, NotificationCategory } from '@app/core/models/notification.model';

/**
 * The alerts behind the header bell.
 *
 * **The list is a fixed sample, not the business.** There is no notifications resource on the
 * server yet: `counters.notifications` is a single number with no list, no category, no timestamp
 * and no read state behind it. The panel was wanted now, so the shape of the real thing is built
 * here and the rows are seeded, with `isSample` true so the panel can say so on screen. Nobody
 * should be able to read these as the actual state of their orders and stock.
 *
 * When the endpoint lands, only this file changes: swap the seed for a fetch, make `markRead` and
 * `markAllRead` call the mutation, and set `isSample` false. The panel reads signals either way.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    /** Whether the rows are the seeded sample rather than the person's own alerts. */
    readonly isSample = true;

    private readonly _items = signal<AppNotification[]>(seed(this.restoreRead()));
    readonly items = this._items.asReadonly();

    readonly unread = computed(() => this._items().filter((n) => !n.readAt).length);
    readonly hasUnread = computed(() => this.unread() > 0);

    markRead(id: string): void {
        const now = new Date().toISOString();
        this._items.update((items) => items.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: now } : n)));
        this.persistRead();
    }

    markAllRead(): void {
        const now = new Date().toISOString();
        this._items.update((items) => items.map((n) => (n.readAt ? n : { ...n, readAt: now })));
        this.persistRead();
    }

    /**
     * Read state is kept per device so "mark all read" survives a reload. Without it the badge
     * comes back on every refresh, which reads as the panel being broken rather than as a sample.
     */
    private persistRead(): void {
        try {
            localStorage.setItem(
                READ_KEY,
                JSON.stringify(
                    this._items()
                        .filter((n) => n.readAt)
                        .map((n) => n.id)
                )
            );
        } catch {
            // Storage blocked. Marking still works for this session, it just does not survive it.
        }
    }

    private restoreRead(): Set<string> {
        try {
            const raw = localStorage.getItem(READ_KEY);
            const parsed: unknown = raw ? JSON.parse(raw) : null;
            return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
        } catch {
            return new Set();
        }
    }
}

const READ_KEY = 'sf_notifications_read';

/** Minutes back from now, so the sample always groups sensibly into Today and Yesterday. */
const ago = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

interface Sample {
    id: string;
    category: NotificationCategory;
    minutes: number;
    en: [string, string];
    bn: [string, string];
}

const SAMPLES: Sample[] = [
    {
        id: 'n-order-address',
        category: 'order',
        minutes: 24,
        en: ['Address needs checking', 'Order SF-2418 has no house number. Confirm it before the order is dispatched.'],
        bn: ['ঠিকানা যাচাই করতে হবে', 'SF-2418 অর্ডারে বাসার নম্বর নেই। পাঠানোর আগে নিশ্চিত করুন।'],
    },
    {
        id: 'n-dispatch-ready',
        category: 'dispatch',
        minutes: 145,
        en: ['6 orders ready for the courier', 'Confirmed and waiting for an export. The oldest has been waiting since yesterday.'],
        bn: ['৬টি অর্ডার কুরিয়ারের জন্য প্রস্তুত', 'নিশ্চিত হয়ে গেছে, এক্সপোর্টের অপেক্ষায়। সবচেয়ে পুরোনোটি গতকাল থেকে অপেক্ষা করছে।'],
    },
    {
        id: 'n-stock-low',
        category: 'stock',
        minutes: 260,
        en: ['Kurti, maroon, M is down to 3', '2 of them are held by open orders. The reorder point is 5.'],
        bn: ['কুর্তি, মেরুন, M এখন ৩টি', 'এর মধ্যে ২টি খোলা অর্ডারে আটকে আছে। রিঅর্ডার পয়েন্ট ৫।'],
    },
    {
        id: 'n-return-received',
        category: 'return',
        minutes: 1180,
        en: ['Return received from Mirpur', '3 pieces are back from order SF-2390. Mark each one good or damaged.'],
        bn: ['মিরপুর থেকে ফেরত এসেছে', 'SF-2390 অর্ডারের ৩টি পণ্য ফিরে এসেছে। প্রতিটি ভালো না ক্ষতিগ্রস্ত, চিহ্নিত করুন।'],
    },
    {
        id: 'n-staff-late',
        category: 'staff',
        minutes: 1465,
        en: ['Rased clocked in at 11:20', 'Two hours after the shift was due to start.'],
        bn: ['রাসেদ ১১:২০ টায় হাজিরা দিয়েছেন', 'শিফট শুরুর কথা ছিল দুই ঘণ্টা আগে।'],
    },
];

const seed = (read: Set<string>): AppNotification[] =>
    SAMPLES.map((s) => ({
        id: s.id,
        category: s.category,
        title: { en: s.en[0], bn: s.bn[0] },
        body: { en: s.en[1], bn: s.bn[1] },
        createdAt: ago(s.minutes),
        // The oldest is seeded read, so the panel shows both row treatments on a first look.
        readAt: read.has(s.id) || s.id === 'n-staff-late' ? ago(s.minutes - 10) : null,
    }));
