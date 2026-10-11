import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DELIVERY_BATCH_LIST } from '@app/modules/sales/delivery-batch/config/delivery-batch-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

@Component({
    selector: 'delivery-batch-list',
    imports: [ListShellPageComponent],
    templateUrl: './delivery-batch-list.component.html',
    styleUrl: './delivery-batch-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryBatchListComponent {
    readonly config = DELIVERY_BATCH_LIST;
}
