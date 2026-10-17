import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PageBack } from '@app/core/models/page-header.model';
import { PartnerFormComponent } from '@app/modules/marketing/partner/components/partner-form.component';
import { PARTNER_ROUTES } from '@app/modules/marketing/partner/constants/partner-routes';
import { PartnerService } from '@app/modules/marketing/partner/services/partner.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

/** Adding a partner. The form is the shared component; this page saves it and says where to go. */
@Component({
    selector: 'partner-create',
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, PartnerFormComponent],
    templateUrl: './partner-create.component.html',
    styleUrl: './partner-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _partners = inject(PartnerService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    readonly back: PageBack = { route: PARTNER_ROUTES.list };
    readonly editor = viewChild(PartnerFormComponent);
    // Set the moment Save is pressed: the name check may still be in flight, and a second press must not start a second wait.
    private readonly _submitting = signal(false);

    readonly saving = computed(() => this._submitting() || this._partners.saving());

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.form.dirty;
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;

        this._submitting.set(true);
        editor.ready().subscribe((ready) => {
            this._submitting.set(false);
            if (!ready) {
                this._message.error(this._translate.instant('form.fixErrors'));
                return;
            }
            const payload = editor.payload();
            const t = (key: string, params?: object) => this._translate.instant(key, params);
            confirmAction(this._modal, { title: t('marketing.partner.confirmCreate.title'), body: t('marketing.partner.confirmCreate.body', { name: payload.name }), ok: t('marketing.partner.add'), cancel: t('form.confirm.cancel') }).subscribe((confirmed) => {
                if (!confirmed) return;
                this._submitting.set(true);
                this._partners.create(payload).subscribe({
                    next: (oid) => {
                        this._submitting.set(false);
                        editor.form.markAsPristine();
                        this._message.success(t('marketing.partner.createdToast'));
                        void this._router.navigateByUrl(PARTNER_ROUTES.detail(oid));
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
        void this._router.navigateByUrl(PARTNER_ROUTES.list);
    }
}
