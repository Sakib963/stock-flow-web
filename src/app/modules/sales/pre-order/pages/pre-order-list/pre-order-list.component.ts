import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PRE_ORDER_LIST } from '@app/modules/sales/pre-order/config/pre-order-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

@Component({
    selector: 'pre-order-list',
    imports: [ListShellPageComponent],
    templateUrl: './pre-order-list.component.html',
    styleUrl: './pre-order-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreOrderListComponent {
    readonly config = PRE_ORDER_LIST;
}
