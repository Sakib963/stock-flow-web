import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PRE_ORDER_BY_PRODUCT } from '@app/modules/sales/pre-order/config/pre-order-by-product.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

@Component({
    selector: 'pre-order-by-product',
    imports: [ListShellPageComponent],
    templateUrl: './pre-order-by-product.component.html',
    styleUrl: './pre-order-by-product.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreOrderByProductComponent {
    readonly config = PRE_ORDER_BY_PRODUCT;
}
