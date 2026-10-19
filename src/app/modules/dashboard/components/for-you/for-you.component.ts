import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDownRight, lucideArrowUpRight, lucideCalendarPlus, lucideClipboardPlus, lucideFileClock, lucideSend, lucideShoppingCart, lucideUserRound, lucideWallet } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { TranslatePipe } from '@ngx-translate/core';
import { DashboardPeriod, ForYou } from '@app/core/models/dashboard.model';
import { SessionService } from '@app/core/services/session/session.service';
import { QUICK_ACTIONS } from '@app/modules/dashboard/constants/dashboard';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { changeOf } from '@app/modules/dashboard/utils/change';

@Component({
    selector: 'for-you',
    imports: [RouterLink, NgIcon, NzButtonModule, NzCardModule, TranslatePipe, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideArrowDownRight, lucideArrowUpRight, lucideCalendarPlus, lucideClipboardPlus, lucideFileClock, lucideSend, lucideShoppingCart, lucideUserRound, lucideWallet })],
    templateUrl: './for-you.component.html',
    styleUrl: './for-you.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForYouComponent {
    private readonly _session = inject(SessionService);

    readonly data = input<ForYou | null>(null);
    readonly period = input.required<DashboardPeriod>();

    readonly actions = computed(() => QUICK_ACTIONS.filter((action) => this._session.can(action.permission)));
    readonly counterChange = computed(() => {
        const counter = this.data()?.counter;
        return counter ? changeOf(counter.sales, counter.previous_sales) : null;
    });
    readonly onlineChange = computed(() => {
        const online = this.data()?.online;
        return online ? changeOf(online.entered, online.previous_entered) : null;
    });
    readonly waiting = computed(() => {
        const drafts = this.data()?.drafts;
        return drafts && drafts.parked + drafts.online > 0 ? drafts : null;
    });
    readonly tileCount = computed(() => [this.data()?.counter, this.data()?.online, this.waiting()].filter(Boolean).length);
}
