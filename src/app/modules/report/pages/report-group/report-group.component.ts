import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeftRight, lucideBoxes, lucideCalendarClock, lucideCalendarDays, lucideChevronRight, lucideFolderTree, lucideGift, lucideGlobe, lucideHandCoins, lucideMapPin, lucideRocket, lucideUserRound, lucideUsers, lucideUserX, lucidePackage, lucideReceiptText, lucideShoppingCart, lucideSlidersHorizontal, lucideTrash2, lucideTruck, lucideUndo2, lucideWallet } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { ReportGroup } from '@app/core/models/report.model';
import { SessionService } from '@app/core/services/session/session.service';
import { REPORTS } from '@app/modules/report/config/reports.config';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';

/** One group's reports, each a tile that opens it. A report needing a permission the person lacks is absent. */
@Component({
    selector: 'report-group',
    imports: [RouterLink, NgIcon, TranslatePipe, PageHeaderComponent],
    providers: [provideIcons({ lucideArrowLeftRight, lucideBoxes, lucideCalendarClock, lucideCalendarDays, lucideChevronRight, lucideFolderTree, lucideGift, lucideGlobe, lucideHandCoins, lucideMapPin, lucideRocket, lucideUserRound, lucideUsers, lucideUserX, lucidePackage, lucideReceiptText, lucideShoppingCart, lucideSlidersHorizontal, lucideTrash2, lucideTruck, lucideUndo2, lucideWallet })],
    templateUrl: './report-group.component.html',
    styleUrl: './report-group.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportGroupComponent {
    private readonly _session = inject(SessionService);
    readonly group = toSignal(inject(ActivatedRoute).data.pipe(map((data) => data['group'] as ReportGroup)), { requireSync: true });
    readonly reports = computed(() => REPORTS[this.group()].filter((report) => !report.requires || this._session.can(report.requires)));
}
