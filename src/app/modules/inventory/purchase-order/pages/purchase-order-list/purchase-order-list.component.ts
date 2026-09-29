import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PURCHASE_ORDER_LIST } from '@app/modules/inventory/purchase-order/config/purchase-order-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Purchase orders, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'purchase-order-list',
    imports: [ListShellPageComponent],
    templateUrl: './purchase-order-list.component.html',
    styleUrl: './purchase-order-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderListComponent {
    readonly config = PURCHASE_ORDER_LIST;
}
