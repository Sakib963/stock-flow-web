import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CUSTOMER_LIST } from '@app/modules/sales/customer/config/customer-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Customers, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'customer-list',
    imports: [ListShellPageComponent],
    templateUrl: './customer-list.component.html',
    styleUrl: './customer-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerListComponent {
    readonly config = CUSTOMER_LIST;
}
