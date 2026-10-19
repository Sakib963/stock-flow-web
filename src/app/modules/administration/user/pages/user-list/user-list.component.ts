import { ChangeDetectionStrategy, Component } from '@angular/core';
import { USER_LIST } from '@app/modules/administration/user/config/user-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

@Component({
    selector: 'user-list',
    imports: [ListShellPageComponent],
    templateUrl: './user-list.component.html',
    styleUrl: './user-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent {
    readonly config = USER_LIST;
}
