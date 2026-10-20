import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslateService } from '@ngx-translate/core';
import { ActionEvent } from '@app/core/models/config.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { USER_LIST } from '@app/modules/administration/user/config/user-list.config';
import { UserService } from '@app/modules/administration/user/services/user.service';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

@Component({
    selector: 'user-list',
    imports: [ListShellPageComponent],
    templateUrl: './user-list.component.html',
    styleUrl: './user-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent {
    private readonly _users = inject(UserService);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService).current;

    readonly config = USER_LIST;

    onAction(event: ActionEvent): void {
        if (event.action.key !== 'sign-out-everyone') return;
        const t = (key: string, params?: object) => localDigits(this._translate.instant(`administration.user.signOutEveryone.${key}`, params), this._language());
        const run = () =>
            new Promise<boolean>((resolve) =>
                this._users.signOutEveryone().subscribe({
                    next: (done) => {
                        this._message.success(t('done', done));
                        resolve(true);
                    },
                    error: (error: unknown) => {
                        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
                        resolve(false);
                    },
                })
            );
        confirmAction(this._modal, { title: t('title'), body: t('body'), ok: t('button'), cancel: this._translate.instant('form.confirm.cancel'), danger: true, icon: 'lucideLogOut', run }).subscribe();
    }
}
