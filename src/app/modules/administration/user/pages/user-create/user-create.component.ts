import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PageBack } from '@app/core/models/page-header.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { UserCreatedComponent, UserCreatedData } from '@app/modules/administration/user/components/user-created/user-created.component';
import { UserFormComponent } from '@app/modules/administration/user/components/user-form/user-form.component';
import { USER_ROUTES } from '@app/modules/administration/user/constants/user-routes';
import { USER_TAKEN } from '@app/modules/administration/user/constants/user-taken';
import { UserService } from '@app/modules/administration/user/services/user.service';
import { saveCopy } from '@app/modules/administration/user/utils/save-copy';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

@Component({
    selector: 'user-create',
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, UserFormComponent],
    templateUrl: './user-create.component.html',
    styleUrl: './user-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _users = inject(UserService);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService).current;

    readonly back: PageBack = { route: USER_ROUTES.list };
    readonly editor = viewChild(UserFormComponent);
    // Set the moment Save is pressed: the email and phone checks may still be running.
    private readonly _submitting = signal(false);
    readonly saving = computed(() => this._submitting() || this._users.saving());

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.form.dirty;
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (editor.uploading() !== null) {
            this._message.warning(this._translate.instant('administration.user.photoStillUploading'));
            return;
        }
        this._submitting.set(true);
        editor.ready().subscribe((ready) => {
            this._submitting.set(false);
            if (!ready) {
                this._message.error(this._translate.instant('form.fixErrors'));
                return;
            }
            const payload = editor.payload();
            confirmAction(this._modal, saveCopy(this._translate, this._language(), { isNew: true, name: payload.name, role: editor.pickedRole() })).subscribe((confirmed) => {
                if (!confirmed) return;
                this._users.create(payload).subscribe({
                    next: (oid) => {
                        editor.form.markAsPristine();
                        this.showCreated(oid, { name: payload.name, email: payload.email ?? '', password: payload.password ?? '' });
                    },
                    error: (error: unknown) => this.onFailed(error),
                });
            });
        });
    }

    private showCreated(oid: string, data: UserCreatedData): void {
        this._modal
            .create<UserCreatedComponent, UserCreatedData>({
                nzTitle: this._translate.instant('administration.user.created.title'),
                nzContent: UserCreatedComponent,
                nzData: data,
                nzFooter: null,
                nzCentered: true,
                nzMaskClosable: false,
                nzClosable: false,
                nzWidth: 480,
            })
            .afterClose.subscribe(() => void this._router.navigateByUrl(USER_ROUTES.detail(oid)));
    }

    private onFailed(error: unknown): void {
        const conflict = this._users.conflictOf(error);
        if (conflict && conflict !== 'stale') {
            this.editor()?.reject(conflict);
            this._message.error(this._translate.instant(USER_TAKEN[conflict]));
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }

    cancel(): void {
        void this._router.navigateByUrl(USER_ROUTES.list);
    }
}
