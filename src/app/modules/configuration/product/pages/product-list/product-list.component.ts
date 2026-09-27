import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PRODUCT_LIST } from '@app/modules/configuration/product/config/product-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Products, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'product-list',
    imports: [ListShellPageComponent],
    templateUrl: './product-list.component.html',
    styleUrl: './product-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
    readonly config = PRODUCT_LIST;
}
