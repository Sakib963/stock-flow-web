import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BRAND_LIST } from '@app/modules/configuration/brand/config/brand-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Brands, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'brand-list',
    imports: [ListShellPageComponent],
    templateUrl: './brand-list.component.html',
    styleUrl: './brand-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandListComponent {
    readonly config = BRAND_LIST;
}
