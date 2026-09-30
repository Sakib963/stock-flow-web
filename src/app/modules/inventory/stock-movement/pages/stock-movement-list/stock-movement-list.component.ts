import { ChangeDetectionStrategy, Component } from '@angular/core';
import { STOCK_MOVEMENT_LIST } from '@app/modules/inventory/stock-movement/config/stock-movement-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Stock movements, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'stock-movement-list',
    imports: [ListShellPageComponent],
    templateUrl: './stock-movement-list.component.html',
    styleUrl: './stock-movement-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockMovementListComponent {
    readonly config = STOCK_MOVEMENT_LIST;
}
