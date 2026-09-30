import { ChangeDetectionStrategy, Component } from '@angular/core';
import { STOCK_OVERVIEW_LIST } from '@app/modules/inventory/stock-overview/config/stock-overview-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** The stock overview, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'stock-overview-list',
    imports: [ListShellPageComponent],
    templateUrl: './stock-overview-list.component.html',
    styleUrl: './stock-overview-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockOverviewListComponent {
    readonly config = STOCK_OVERVIEW_LIST;
}
