import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun, lucideSunrise, lucideSunset } from '@ng-icons/lucide';
import { TranslateService } from '@ngx-translate/core';
import { AttentionKey, AttentionRow, Business, Dashboard, DashboardPeriod, ForYou } from '@app/core/models/dashboard.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ATTENTION } from '@app/modules/dashboard/constants/dashboard';
import { changeOf } from '@app/modules/dashboard/utils/change';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { businessZone } from '@app/shared/utils/business-time/business-time';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';

const ORDER = Object.keys(ATTENTION) as AttentionKey[];
const TICK_MS = 60_000;

const PARTS: readonly { until: number; key: string; icon: string }[] = [
    { until: 5, key: 'evening', icon: 'lucideMoon' },
    { until: 12, key: 'morning', icon: 'lucideSunrise' },
    { until: 17, key: 'afternoon', icon: 'lucideSun' },
    { until: 21, key: 'evening', icon: 'lucideSunset' },
    { until: 24, key: 'evening', icon: 'lucideMoon' },
];

const ready = <T>(section: unknown): T | null => (section && typeof section === 'object' && !('failed' in section) ? (section as T) : null);

@Component({
    selector: 'welcome',
    imports: [NgIcon],
    providers: [MoneyPipe, provideIcons({ lucideMoon, lucideSun, lucideSunrise, lucideSunset })],
    templateUrl: './welcome.component.html',
    styleUrl: './welcome.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {
    private readonly _translate = inject(TranslateService);
    private readonly _session = inject(SessionService);
    private readonly _money = inject(MoneyPipe);
    private readonly _language = inject(LanguageService).current;

    readonly data = input<Dashboard | null>(null);
    readonly period = input.required<DashboardPeriod>();

    private readonly _now = signal(new Date());

    readonly part = computed(() => {
        const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: businessZone() }).format(this._now()));
        return PARTS.find((p) => hour < p.until)!;
    });
    readonly greeting = computed(() => {
        this._language();
        const first = (this._session.user()?.name ?? '').trim().split(/\s+/)[0] ?? '';
        return this._translate.instant(`dashboard.greeting.${this.part().key}`, { name: first });
    });
    readonly day = computed(() => {
        const locale = this._language() === 'bn' ? 'bn-BD' : 'en-GB';
        const day = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: businessZone() }).format(this._now());
        const business = this._session.business()?.name;
        return business ? `${day} · ${business}` : day;
    });

    readonly summary = computed(() => {
        const data = this.data();
        if (!data) return '';
        const language = this._language();
        const period = this.period();
        const t = (key: string, params: object = {}) => this._translate.instant(`dashboard.welcome.${key}`, params);
        const when = t(`when.${period}`);
        const compared = (sentence: string, now: number, before: number) => {
            const change = changeOf(now, before);
            if (!change) return sentence;
            const params = { percent: change.percent, before: t(`before.${period}`) };
            return `${sentence} ${t(change.percent === 0 ? 'same' : change.up ? 'up' : 'down', params)}`;
        };

        const parts: string[] = [];
        const forYou = ready<ForYou>(data.for_you);
        const business = ready<Business>(data.business);
        if (forYou?.counter) parts.push(compared(t('counter', { amount: this._money.transform(forYou.counter.sales), when }), forYou.counter.sales, forYou.counter.previous_sales));
        else if (forYou?.online) parts.push(t(forYou.online.entered === 1 ? 'onlineOne' : 'online', { count: forYou.online.entered, when }));
        else if (business) parts.push(compared(t('business', { amount: this._money.transform(business.current.sales), when }), business.current.sales, business.previous.sales));

        const attention = ready<AttentionRow[]>(data.attention);
        if (attention) {
            const first = [...attention].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))[0];
            parts.push(first ? t('firstUp', { label: this._translate.instant(`dashboard.attention.${first.key}`), count: first.count }) : t('clear'));
        }
        return localDigits(parts.join(' '), language);
    });

    constructor() {
        const timer = setInterval(() => this._now.set(new Date()), TICK_MS);
        inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
}
