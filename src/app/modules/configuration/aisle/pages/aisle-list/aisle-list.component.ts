import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AISLE_LIST } from '@app/modules/configuration/aisle/config/aisle-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Aisles, drawn entirely from its config by the list shell page. */
@Component({
    selector: 'aisle-list',
    imports: [ListShellPageComponent],
    templateUrl: './aisle-list.component.html',
    styleUrl: './aisle-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AisleListComponent {
    readonly config = AISLE_LIST;
}
