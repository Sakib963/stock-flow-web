import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionService } from '@app/core/services/session/session.service';
import { giveawayList } from '@app/modules/sales/giveaway/config/giveaway-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

@Component({
    selector: 'giveaway-list',
    imports: [ListShellPageComponent],
    templateUrl: './giveaway-list.component.html',
    styleUrl: './giveaway-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiveawayListComponent {
    readonly config = giveawayList({ seesMoney: inject(SessionService).can('inventory.stock-value.view') });
}
