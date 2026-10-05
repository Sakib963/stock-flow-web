import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OrderScope } from '@app/core/models/order.model';
import { SessionService } from '@app/core/services/session/session.service';
import { orderList } from '@app/modules/sales/order/config/order-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Orders or Order history, by the route's scope, drawn from its config by the list shell page. */
@Component({
    selector: 'order-list',
    imports: [ListShellPageComponent],
    templateUrl: './order-list.component.html',
    styleUrl: './order-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderListComponent {
    private readonly _session = inject(SessionService);
    readonly config = orderList({ scope: (inject(ActivatedRoute).snapshot.data['scope'] as OrderScope | undefined) ?? 'all', bothChannels: this._session.can('sales.pos.view') && this._session.can('sales.online.view') });
}
