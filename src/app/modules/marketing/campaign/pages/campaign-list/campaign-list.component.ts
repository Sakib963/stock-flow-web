import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CAMPAIGN_LIST } from '@app/modules/marketing/campaign/config/campaign-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Campaigns, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'campaign-list',
    imports: [ListShellPageComponent],
    templateUrl: './campaign-list.component.html',
    styleUrl: './campaign-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignListComponent {
    readonly config = CAMPAIGN_LIST;
}
