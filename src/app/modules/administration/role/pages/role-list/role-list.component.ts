import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ROLE_LIST } from '@app/modules/administration/role/config/role-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

@Component({
    selector: 'role-list',
    imports: [ListShellPageComponent],
    templateUrl: './role-list.component.html',
    styleUrl: './role-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleListComponent {
    readonly config = ROLE_LIST;
}
