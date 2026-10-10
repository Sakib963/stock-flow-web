import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionService } from '@app/core/services/session/session.service';
import { returnList } from '@app/modules/sales/return/config/return-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

@Component({
    selector: 'return-list',
    imports: [ListShellPageComponent],
    templateUrl: './return-list.component.html',
    styleUrl: './return-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnListComponent {
    private readonly _session = inject(SessionService);
    readonly config = returnList({ bothChannels: this._session.can('sales.pos.view') && this._session.can('sales.online.view') });
}
