import { ChangeDetectionStrategy, Component, computed, viewChild } from '@angular/core';
import { CATEGORY_LIST } from '@app/modules/configuration/config/category-list/category-list.config';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { TableComponent } from '@app/shared/components/table/table.component';

/**
 * Categories, hosting the page header and the table from their configs. The list shell page
 * replaces this component when it is built; the route then points at the shell with the same config.
 */
@Component({
    selector: 'category-list',
    imports: [PageHeaderComponent, TableComponent],
    templateUrl: './category-list.component.html',
    styleUrl: './category-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryListComponent {
    readonly config = CATEGORY_LIST;

    private readonly _table = viewChild(TableComponent);
    // The store, not the table's own view of it: the header binds before the table has its config.
    readonly total = computed(() => this._table()?.store.total() ?? null);
}
