import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { RequestFailure } from '@app/core/models/api.model';
import { CampaignDetails } from '@app/core/models/campaign.model';
import { PageBack } from '@app/core/models/page-header.model';
import { CampaignFormComponent } from '@app/modules/marketing/campaign/components/campaign-form/campaign-form.component';
import { CAMPAIGN_ROUTES } from '@app/modules/marketing/campaign/constants/campaign-routes';
import { CampaignService } from '@app/modules/marketing/campaign/services/campaign.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf, isStale } from '@app/shared/utils/request-failure/request-failure';

/** Changing a Planned or Live campaign: load it, hand it to the form, save what comes back. */
@Component({
    selector: 'campaign-edit',
    imports: [NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, CampaignFormComponent],
    templateUrl: './campaign-edit.component.html',
    styleUrl: './campaign-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);
    readonly campaigns = inject(CampaignService);

    private readonly _oid = this._route.snapshot.paramMap.get('oid') ?? '';

    readonly back: PageBack = { route: CAMPAIGN_ROUTES.list };
    readonly editor = viewChild(CampaignFormComponent);
    readonly record = signal<CampaignDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    /** A Completed or Cancelled campaign is a record and opens to say so, not as a form. */
    readonly closed = computed(() => {
        const status = this.record()?.details.status;
        return status === 'Completed' || status === 'Cancelled';
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this.campaigns.details(this._oid).subscribe({
            next: (record) => {
                this.record.set(record);
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
        if (!editor || this.campaigns.saving()) return;
        if (!editor.form.dirty) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
        if (!editor.valid()) {
            this._message.error(this._translate.instant(editor.batches().length ? 'form.fixErrors' : 'marketing.campaign.needsBatch'));
            return;
        }
        const payload = editor.payload(this._oid);
        const t = (key: string, params?: object) => this._translate.instant(key, params);
        confirmAction(this._modal, { title: t('marketing.campaign.confirmEdit.title'), body: t('marketing.campaign.confirmEdit.body', { name: payload.name }), ok: t('form.saveChanges'), cancel: t('form.confirm.cancel') }).subscribe((confirmed) => {
            if (!confirmed) return;
            this.campaigns.save(payload, this.record()?.details.version ?? '').subscribe({
                next: () => {
                    editor.form.markAsPristine();
                    this._message.success(t('marketing.campaign.updated'));
                    void this._router.navigateByUrl(CAMPAIGN_ROUTES.detail(this._oid));
                },
                error: (error: unknown) => {
                    // A campaign completed or cancelled meanwhile: the server says so in its own words.
                    if (!isStale(error) && error instanceof HttpErrorResponse && error.status === 409) {
                        this._message.error(error.error?.message ?? t('form.saveFailed'));
                        return;
                    }
                    this._message.error(t(failureKey(error, 'form.saveFailed')));
                },
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(CAMPAIGN_ROUTES.detail(this._oid));
    }

    backToList(): void {
        void this._router.navigateByUrl(CAMPAIGN_ROUTES.list);
    }
}
