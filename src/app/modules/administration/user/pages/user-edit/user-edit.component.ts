import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideRotateCw } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { RequestFailure } from '@app/core/models/api.model';
import { PageBack } from '@app/core/models/page-header.model';
import { User } from '@app/core/models/user.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { UserFormComponent } from '@app/modules/administration/user/components/user-form/user-form.component';
import { USER_ROUTES } from '@app/modules/administration/user/constants/user-routes';
import { USER_TAKEN } from '@app/modules/administration/user/constants/user-taken';
import { UserService } from '@app/modules/administration/user/services/user.service';
import { saveCopy } from '@app/modules/administration/user/utils/save-copy';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

@Component({
    selector: 'user-edit',
    imports: [NgIcon, NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, UserFormComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideRotateCw })],
    templateUrl: './user-edit.component.html',
    styleUrl: './user-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _users = inject(UserService);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService).current;

    private readonly _oid = this._route.snapshot.paramMap.get('oid') ?? '';

    readonly back: PageBack = { route: USER_ROUTES.list };
    readonly editor = viewChild(UserFormComponent);
    readonly user = signal<User | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    private readonly _submitting = signal(false);
    readonly saving = computed(() => this._submitting() || this._users.saving());

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._users.details(this._oid).subscribe({
            next: ({ details }) => {
                // Deleting is final, and a person beyond the editor's own access cannot be changed by them.
                if (details.status === 'Deleted' || !details.within_reach) return void this._router.navigateByUrl(USER_ROUTES.detail(this._oid));
                this.user.set(details);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.form.dirty;
    }

    save(): void {
        const editor = this.editor();
        const user = this.user();
        if (!editor || !user || this.saving()) return;
        if (!editor.form.dirty) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
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
            const newRole = payload.role_oid !== user.role_oid ? editor.pickedRole() : null;
            confirmAction(this._modal, saveCopy(this._translate, this._language(), { isNew: false, name: payload.name, role: newRole })).subscribe((confirmed) => {
                if (!confirmed) return;
                this._users.update(payload).subscribe({
                    next: (saved) => {
                        editor.form.markAsPristine();
                        this._message[saved.changed ? 'success' : 'info'](this._translate.instant(saved.changed ? 'administration.user.updated' : 'form.nothingChanged'));
                        void this._router.navigateByUrl(USER_ROUTES.detail(this._oid));
                    },
                    error: (error: unknown) => this.onFailed(error),
                });
            });
        });
    }

    private onFailed(error: unknown): void {
        const conflict = this._users.conflictOf(error);
        if (conflict === 'stale') {
            this._message.warning(this._translate.instant('administration.user.stale'));
            this.editor()?.form.markAsPristine();
            this.load();
            return;
        }
        if (conflict) {
            this.editor()?.reject(conflict);
            this._message.error(this._translate.instant(USER_TAKEN[conflict]));
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }

    cancel(): void {
        void this._router.navigateByUrl(USER_ROUTES.detail(this._oid));
    }

    backToList(): void {
        void this._router.navigateByUrl(USER_ROUTES.list);
    }
}
