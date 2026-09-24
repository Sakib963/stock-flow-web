import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CATEGORY_LIST } from '@app/modules/configuration/category/config/category-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Categories, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'category-list',
    imports: [ListShellPageComponent],
    templateUrl: './category-list.component.html',
    styleUrl: './category-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryListComponent {
    readonly config = CATEGORY_LIST;
}
