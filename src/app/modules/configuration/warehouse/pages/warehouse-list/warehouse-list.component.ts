import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WAREHOUSE_LIST } from '@app/modules/configuration/warehouse/config/warehouse-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Warehouses, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'warehouse-list',
    imports: [ListShellPageComponent],
    templateUrl: './warehouse-list.component.html',
    styleUrl: './warehouse-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseListComponent {
    readonly config = WAREHOUSE_LIST;
}
