import { ChangeDetectionStrategy, Component } from '@angular/core';
import { STOCK_ADJUSTMENT_LIST } from '@app/modules/inventory/stock-adjustment/config/stock-adjustment-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Stock adjustments, drawn from its config by the list shell page. */
@Component({
    selector: 'stock-adjustment-list',
    imports: [ListShellPageComponent],
    templateUrl: './stock-adjustment-list.component.html',
    styleUrl: './stock-adjustment-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustmentListComponent {
    readonly config = STOCK_ADJUSTMENT_LIST;
}
