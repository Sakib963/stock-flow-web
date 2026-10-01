import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DISPOSAL_LIST } from '@app/modules/inventory/disposal/config/disposal-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

/** Stock disposals, drawn from its config by the list shell page. */
@Component({
    selector: 'disposal-list',
    imports: [ListShellPageComponent],
    templateUrl: './disposal-list.component.html',
    styleUrl: './disposal-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisposalListComponent {
    readonly config = DISPOSAL_LIST;
}
