import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionService } from '@app/core/services/session/session.service';
import { orderList } from '@app/modules/sales/order/config/order-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Orders from both counters, drawn from its config by the list shell page. */
@Component({
    selector: 'order-list',
    imports: [ListShellPageComponent],
    templateUrl: './order-list.component.html',
    styleUrl: './order-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderListComponent {
    private readonly _session = inject(SessionService);
    readonly config = orderList({ bothChannels: this._session.can('sales.pos.view') && this._session.can('sales.online.view'), ownFirst: !this._session.can('sales.order.confirm') });
}
