import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { TranslateService } from '@ngx-translate/core';
import { CATEGORY_LIST } from '@app/modules/configuration/config/category-list/category-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/**
 * Categories, drawn entirely from its config by the list shell page.
 *
 * The page exists for the one thing a config cannot hold: what Add, View and Edit do. Until the
 * category form is built they say so, which is honest, and the day it exists this component goes
 * back to being a wrapper while the config's three `emit` runs become `navigate`.
 */
@Component({
    selector: 'category-list',
    imports: [ListShellPageComponent],
    templateUrl: './category-list.component.html',
    styleUrl: './category-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryListComponent {
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    readonly config = CATEGORY_LIST;

    /** Add, View and Edit all land here, and all three have the same answer until the form exists. */
    onAction(): void {
        this._message.info(this._translate.instant('configuration.category.formComing'));
    }
}
