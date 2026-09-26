import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SUB_CATEGORY_LIST } from '@app/modules/configuration/sub-category/config/sub-category-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Sub-categories, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'sub-category-list',
    imports: [ListShellPageComponent],
    templateUrl: './sub-category-list.component.html',
    styleUrl: './sub-category-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubCategoryListComponent {
    readonly config = SUB_CATEGORY_LIST;
}
