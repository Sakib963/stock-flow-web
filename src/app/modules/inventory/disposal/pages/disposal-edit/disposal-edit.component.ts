import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideRotateCw, lucideSave } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PageBack } from '@app/core/models/page-header.model';
import { DisposalRecord } from '@app/core/models/disposal.model';
import { DisposalFormComponent } from '@app/modules/inventory/disposal/components/disposal-form/disposal-form.component';
import { DISPOSAL_ROUTES } from '@app/modules/inventory/disposal/constants/disposal-routes';
import { DisposalService } from '@app/modules/inventory/disposal/services/disposal.service';
import { disposalFailure } from '@app/modules/inventory/disposal/utils/disposal-failure/disposal-failure';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/** Editing a Draft or a Submitted disposal. Once approved, rejected or cancelled it is read only. */
@Component({
    selector: 'disposal-edit',
    imports: [NgIcon, NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, DisposalFormComponent],
    providers: [DigitsPipe, provideIcons({ lucideArrowLeft, lucideRotateCw, lucideSave })],
    templateUrl: './disposal-edit.component.html',
    styleUrl: './disposal-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisposalEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _disposals = inject(DisposalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);
    private readonly _digits = inject(DigitsPipe);

    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: DISPOSAL_ROUTES.detail(this.oid) };
    readonly editor = viewChild(DisposalFormComponent);
    private readonly _asking = signal(false);
    readonly saving = computed(() => this._asking() || this._disposals.saving());
    readonly drafting = signal(false);
    readonly submitting = computed(() => this.saving() && !this.drafting());

    readonly record = signal<DisposalRecord | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly closed = computed(() => {
        const status = this.record()?.details.status;
        return status && status !== 'Submitted' && status !== 'Draft' ? status.toLowerCase() : null;
    });
    readonly draft = computed(() => this.record()?.details.status === 'Draft');
    readonly saveLabel = computed(() => (this.draft() ? 'inventory.disposal.submit' : 'inventory.disposal.saveChanges'));

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._disposals.details(this.oid).subscribe({
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
        if (!editor || this.saving()) return;
        if (!editor.form.dirty && !this.draft()) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
        if (!editor.valid()) {
            this._message.error(this._translate.instant(editor.started().length ? 'form.fixErrors' : 'inventory.disposal.needsLine'));
            return;
        }
        const payload = editor.payload(false);
        const number = this.record()?.details.dispose_no;
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant(this.draft() ? 'inventory.disposal.confirmSubmit.title' : 'inventory.disposal.confirmEdit.title', { number }),
            body: this._translate.instant(this.draft() ? 'inventory.disposal.confirmSubmit.body' : 'inventory.disposal.confirmEdit.body', { number, ...this.localDigits({ count: payload.lines.length, units: editor.units() }) }),
            ok: this._translate.instant(this.saveLabel()),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._disposals.update(payload).subscribe({
                next: (changed) => {
                    editor.form.markAsPristine();
                    if (changed) this._message.success(this._translate.instant(this.draft() ? 'inventory.disposal.submittedMessage' : 'inventory.disposal.updated', { number }));
                    else this._message.info(this._translate.instant('form.nothingChanged'));
                    void this._router.navigateByUrl(DISPOSAL_ROUTES.detail(this.oid));
                },
                error: (error: unknown) => this.fail(error),
            });
        });
    }

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
                .update(payload)
                .pipe(finalize(() => this.drafting.set(false)))
                .subscribe({
                    next: (changed) => {
                        editor.form.markAsPristine();
                        this._message[changed ? 'success' : 'info'](this._translate.instant(changed ? 'inventory.disposal.draftSaved' : 'form.nothingChanged'));
                    },
                    error: (error: unknown) => this.fail(error),
                });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(DISPOSAL_ROUTES.detail(this.oid));
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
