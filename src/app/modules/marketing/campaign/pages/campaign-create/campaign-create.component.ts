import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PageBack } from '@app/core/models/page-header.model';
import { CampaignFormComponent } from '@app/modules/marketing/campaign/components/campaign-form/campaign-form.component';
import { CAMPAIGN_ROUTES } from '@app/modules/marketing/campaign/constants/campaign-routes';
import { CampaignService } from '@app/modules/marketing/campaign/services/campaign.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

/** Planning a campaign. The form is the shared component; this page saves it and says where to go. */
@Component({
    selector: 'campaign-create',
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, CampaignFormComponent],
    templateUrl: './campaign-create.component.html',
    styleUrl: './campaign-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);
    readonly campaigns = inject(CampaignService);

    /** Made once, so a save repeated after a lost answer finds the campaign it already made. */
    private readonly _oid = crypto.randomUUID();

    readonly back: PageBack = { route: CAMPAIGN_ROUTES.list };
    readonly editor = viewChild(CampaignFormComponent);

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.form.dirty;
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.campaigns.saving()) return;
        if (!editor.valid()) {
            this._message.error(this._translate.instant(editor.batches().length ? 'form.fixErrors' : 'marketing.campaign.needsBatch'));
            return;
        }
        const payload = editor.payload(this._oid);
        const t = (key: string, params?: object) => this._translate.instant(key, params);
        confirmAction(this._modal, { title: t('marketing.campaign.confirmCreate.title'), body: t('marketing.campaign.confirmCreate.body', { name: payload.name }), ok: t('marketing.campaign.add'), cancel: t('form.confirm.cancel') }).subscribe((confirmed) => {
            if (!confirmed) return;
            this.campaigns.save(payload, false).subscribe({
                next: (oid) => {
                    editor.form.markAsPristine();
                    this._message.success(t('marketing.campaign.created'));
                    void this._router.navigateByUrl(CAMPAIGN_ROUTES.detail(oid));
                },
                error: (error: unknown) => this._message.error(t(failureKey(error, 'form.saveFailed'))),
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(CAMPAIGN_ROUTES.list);
    }
}
