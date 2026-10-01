import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSave } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PageBack } from '@app/core/models/page-header.model';
import { SessionService } from '@app/core/services/session/session.service';
import { DisposalFormComponent } from '@app/modules/inventory/disposal/components/disposal-form/disposal-form.component';
import { DISPOSAL_ROUTES } from '@app/modules/inventory/disposal/constants/disposal-routes';
import { DisposalService } from '@app/modules/inventory/disposal/services/disposal.service';
import { disposalFailure } from '@app/modules/inventory/disposal/utils/disposal-failure/disposal-failure';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';

/** A new disposal. Submitting moves nothing: stock changes only when it is approved, in a separate click. */
@Component({
    selector: 'disposal-create',
    imports: [NgIcon, NzButtonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, DisposalFormComponent],
    providers: [DigitsPipe, provideIcons({ lucideSave })],
    templateUrl: './disposal-create.component.html',
    styleUrl: './disposal-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisposalCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _disposals = inject(DisposalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);
    private readonly _digits = inject(DigitsPipe);
    private readonly _session = inject(SessionService);

    readonly back: PageBack = { route: DISPOSAL_ROUTES.list };
    readonly editor = viewChild(DisposalFormComponent);
    private readonly _asking = signal(false);
    /** Set once a save succeeds and stays set until the page has gone, so nothing can be pressed in between. */
    private readonly _leaving = signal(false);
    readonly saving = computed(() => this._asking() || this._leaving() || this._disposals.saving());
    readonly drafting = signal(false);
    readonly submitting = computed(() => this.saving() && !this.drafting());

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.form.dirty;
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.valid()) {
            this._message.error(this._translate.instant(editor.started().length ? 'form.fixErrors' : 'inventory.disposal.needsLine'));
            return;
        }
        const payload = editor.payload(false);
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('inventory.disposal.confirmSubmit.title'),
            body: this._translate.instant('inventory.disposal.confirmSubmit.body', this.localDigits({ count: payload.lines.length, units: editor.units() })),
            ok: this._translate.instant('inventory.disposal.submit'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._disposals.create(payload).subscribe({
                next: ({ oid, dispose_no }) => {
                    editor.form.markAsPristine();
                    this._message.success(this._translate.instant('inventory.disposal.submittedMessage', { number: dispose_no }));
                    this._leaving.set(true);
                    void this._router.navigateByUrl(DISPOSAL_ROUTES.detail(oid));
                },
                error: (error: unknown) => this.fail(error),
            });
        });
    }

    /** Saves what is typed so far, needing nothing more, and carries on in that draft's edit page. */
    saveDraft(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.validDraft()) {
            this._message.error(this._translate.instant('form.fixErrors'));
            return;
        }
        const payload = editor.payload(true);
        this.drafting.set(true);
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('inventory.disposal.confirmDraft.title'),
            body: this._translate.instant('inventory.disposal.confirmDraft.body'),
            ok: this._translate.instant('inventory.disposal.saveDraft'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) {
                this.drafting.set(false);
                return;
            }
            this._disposals
                .create(payload)
                .pipe(finalize(() => this.drafting.set(false)))
                .subscribe({
                    next: ({ oid, dispose_no }) => {
                        editor.form.markAsPristine();
                        this._message.success(this._translate.instant('inventory.disposal.draftSavedMessage', { number: dispose_no }));
                        // Carry on in the draft, or open its record for someone who may create but not edit.
                        this._leaving.set(true);
                        void this._router.navigateByUrl(this._session.can('inventory.product-dispose.edit') ? DISPOSAL_ROUTES.edit(oid) : DISPOSAL_ROUTES.detail(oid), { replaceUrl: true });
                    },
                    error: (error: unknown) => this.fail(error),
                });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(DISPOSAL_ROUTES.list);
    }

    private fail(error: unknown): void {
        const { key, params } = disposalFailure(error, 'form.saveFailed');
        this._message.error(this._translate.instant(key, this.localDigits(params)));
    }

    /** Counts in a message follow the language on screen; codes such as DSP-2610-0001 are left alone. */
    private localDigits(params: Record<string, unknown>): Record<string, unknown> {
        return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === 'number' ? this._digits.transform(value) : value]));
    }
}
