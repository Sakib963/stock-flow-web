import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PARTNER_LIST } from '@app/modules/marketing/partner/config/partner-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Partners, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'partner-list',
    imports: [ListShellPageComponent],
    templateUrl: './partner-list.component.html',
    styleUrl: './partner-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerListComponent {
    readonly config = PARTNER_LIST;
}
