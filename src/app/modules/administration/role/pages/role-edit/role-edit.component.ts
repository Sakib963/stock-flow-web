import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
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
import { RoleDetails } from '@app/core/models/role.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { RoleFormComponent } from '@app/modules/administration/role/components/role-form/role-form.component';
import { ROLE_ROUTES } from '@app/modules/administration/role/constants/role-routes';
import { RoleService } from '@app/modules/administration/role/services/role.service';
import { askBeforeSaving } from '@app/modules/administration/role/utils/ask-before-saving';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

@Component({
    selector: 'role-edit',
    imports: [NgIcon, NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, RoleFormComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideRotateCw })],
    templateUrl: './role-edit.component.html',
    styleUrl: './role-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService).current;
    private readonly _session = inject(SessionService);

    private readonly _oid = this._route.snapshot.paramMap.get('oid') ?? '';

    readonly roles = inject(RoleService);
    readonly back: PageBack = { route: ROLE_ROUTES.list };
    readonly editor = viewChild(RoleFormComponent);
    readonly role = signal<RoleDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this.roles.details(this._oid).subscribe({
            next: (role) => {
                this.role.set(role);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.dirty();
    }

    save(): void {
        const editor = this.editor();
        const role = this.role();
        if (!editor || !role || this.roles.saving()) return;
        if (!editor.dirty()) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
        if (!editor.valid()) {
            this._message.error(this._translate.instant('form.fixErrors'));
            return;
        }
        const payload = editor.payload();
        const { added, removed } = editor.diff();
        askBeforeSaving(this._modal, this._translate, this._language(), { name: payload.name, isNew: false, holders: role.holders, added, removed, editor: this._session.user()?.email ?? null }).subscribe((confirmed) => {
            if (!confirmed) return;
            this.roles.update(payload).subscribe({
                next: (saved) => {
                    editor.form.markAsPristine();
                    editor.reload(payload.codes);
                    const key = !saved.changed ? 'form.nothingChanged' : saved.holders ? 'administration.role.updatedFor' : 'administration.role.updated';
                    this._message[saved.changed ? 'success' : 'info'](this._translate.instant(key, { count: saved.holders }));
                    void this._router.navigateByUrl(ROLE_ROUTES.detail(this._oid));
                },
                error: (error: unknown) => this.onFailed(error),
            });
        });
    }

    private onFailed(error: unknown): void {
        const conflict = this.roles.conflictOf(error);
        if (conflict === 'name') {
            this.editor()?.markNameTaken();
            this._message.error(this._translate.instant('administration.role.nameTaken'));
            return;
        }
        if (conflict === 'stale') {
            this._message.warning(this._translate.instant('administration.role.stale'));
            this.load();
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }

    cancel(): void {
        void this._router.navigateByUrl(ROLE_ROUTES.detail(this._oid));
    }

    backToList(): void {
        void this._router.navigateByUrl(ROLE_ROUTES.list);
    }
}
