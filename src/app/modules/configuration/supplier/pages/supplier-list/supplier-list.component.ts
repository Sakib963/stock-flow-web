import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SUPPLIER_LIST } from '@app/modules/configuration/supplier/config/supplier-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Suppliers, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'supplier-list',
    imports: [ListShellPageComponent],
    templateUrl: './supplier-list.component.html',
    styleUrl: './supplier-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierListComponent {
    readonly config = SUPPLIER_LIST;
}
