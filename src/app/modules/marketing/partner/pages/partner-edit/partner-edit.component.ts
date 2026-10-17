import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { RequestFailure } from '@app/core/models/api.model';
import { PageBack } from '@app/core/models/page-header.model';
import { Partner } from '@app/core/models/partner.model';
import { PartnerFormComponent } from '@app/modules/marketing/partner/components/partner-form.component';
import { PARTNER_ROUTES } from '@app/modules/marketing/partner/constants/partner-routes';
import { PartnerService } from '@app/modules/marketing/partner/services/partner.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

/** Editing a partner: load it, hand it to the form, save what comes back. */
@Component({
    selector: 'partner-edit',
    imports: [NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, PartnerFormComponent],
    templateUrl: './partner-edit.component.html',
    styleUrl: './partner-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _partners = inject(PartnerService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    private readonly _oid = this._route.snapshot.paramMap.get('oid') ?? '';

    readonly back: PageBack = { route: PARTNER_ROUTES.list };
    readonly editor = viewChild(PartnerFormComponent);
    private readonly _submitting = signal(false);

    readonly saving = computed(() => this._submitting() || this._partners.saving());
    readonly partner = signal<Partner | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._partners.details(this._oid).subscribe({
            next: ({ details }) => {
                this.partner.set(details);
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
        if (!editor || this.saving()) return;
        if (!editor.form.dirty) {
            this._message.info(this._translate.instant('form.nothingChanged'));
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
            const t = (key: string, params?: object) => this._translate.instant(key, params);
            confirmAction(this._modal, { title: t('marketing.partner.confirmEdit.title'), body: t('marketing.partner.confirmEdit.body', { name: payload.name }), ok: t('form.saveChanges'), cancel: t('form.confirm.cancel') }).subscribe((confirmed) => {
                if (!confirmed) return;
                this._submitting.set(true);
                this._partners.update(payload).subscribe({
                    next: (changed) => {
                        this._submitting.set(false);
                        editor.form.markAsPristine();
                        this._message[changed ? 'success' : 'info'](t(changed ? 'marketing.partner.updated' : 'form.nothingChanged'));
                        void this._router.navigateByUrl(PARTNER_ROUTES.detail(this._oid));
                    },
                    error: (error: unknown) => {
                        this._submitting.set(false);
                        if (this._partners.nameTaken(error)) {
                            editor.rejectName();
                            this._message.error(t('marketing.partner.nameTaken'));
                            return;
                        }
                        this._message.error(t(failureKey(error, 'form.saveFailed')));
                    },
                });
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(PARTNER_ROUTES.detail(this._oid));
    }

    backToList(): void {
        void this._router.navigateByUrl(PARTNER_ROUTES.list);
    }
}
