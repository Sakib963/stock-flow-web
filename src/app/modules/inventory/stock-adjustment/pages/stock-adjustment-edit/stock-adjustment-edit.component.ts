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
import { StockAdjustmentRecord } from '@app/core/models/stock-adjustment.model';
import { StockAdjustmentFormComponent } from '@app/modules/inventory/stock-adjustment/components/stock-adjustment-form/stock-adjustment-form.component';
import { STOCK_ADJUSTMENT_ROUTES } from '@app/modules/inventory/stock-adjustment/constants/stock-adjustment-routes';
import { StockAdjustmentService } from '@app/modules/inventory/stock-adjustment/services/stock-adjustment.service';
import { adjustmentFailure } from '@app/modules/inventory/stock-adjustment/utils/adjustment-failure/adjustment-failure';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/** Editing a Draft or a Submitted adjustment. Once verified, rejected or cancelled it is read only. */
@Component({
    selector: 'stock-adjustment-edit',
    imports: [NgIcon, NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, StockAdjustmentFormComponent],
    providers: [DigitsPipe, provideIcons({ lucideArrowLeft, lucideRotateCw, lucideSave })],
    templateUrl: './stock-adjustment-edit.component.html',
    styleUrl: './stock-adjustment-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustmentEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _adjustments = inject(StockAdjustmentService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);
    private readonly _digits = inject(DigitsPipe);

    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: STOCK_ADJUSTMENT_ROUTES.detail(this.oid) };
    readonly editor = viewChild(StockAdjustmentFormComponent);
    private readonly _asking = signal(false);
    readonly saving = computed(() => this._asking() || this._adjustments.saving());
    readonly drafting = signal(false);
    readonly submitting = computed(() => this.saving() && !this.drafting());

    readonly record = signal<StockAdjustmentRecord | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly closed = computed(() => {
        const status = this.record()?.details.status;
        return status && status !== 'Submitted' && status !== 'Draft' ? status.toLowerCase() : null;
    });
    readonly draft = computed(() => this.record()?.details.status === 'Draft');
    readonly saveLabel = computed(() => (this.draft() ? 'inventory.stockAdjustment.submit' : 'inventory.stockAdjustment.saveChanges'));

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._adjustments.details(this.oid).subscribe({
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
            this._message.error(this._translate.instant(editor.started().length ? 'form.fixErrors' : 'inventory.stockAdjustment.needsLine'));
            return;
        }
        const payload = editor.payload(false);
        const number = this.record()?.details.adjustment_number;
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant(this.draft() ? 'inventory.stockAdjustment.confirmSubmit.title' : 'inventory.stockAdjustment.confirmEdit.title', { number }),
            body: this._translate.instant(this.draft() ? 'inventory.stockAdjustment.confirmSubmit.body' : 'inventory.stockAdjustment.confirmEdit.body', { number, ...this.localDigits({ count: payload.lines.length, in: editor.unitsIn(), out: editor.unitsOut() }) }),
            ok: this._translate.instant(this.saveLabel()),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._adjustments.update(payload).subscribe({
                next: (changed) => {
                    editor.form.markAsPristine();
                    if (changed) this._message.success(this._translate.instant(this.draft() ? 'inventory.stockAdjustment.submittedMessage' : 'inventory.stockAdjustment.updated', { number }));
                    else this._message.info(this._translate.instant('form.nothingChanged'));
                    void this._router.navigateByUrl(STOCK_ADJUSTMENT_ROUTES.detail(this.oid));
                },
                error: (error: unknown) => this.fail(error),
            });
        });
    }

    saveDraft(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.validDraft()) {
            this._message.error(this._translate.instant('inventory.stockAdjustment.draftNeedsReason'));
            return;
        }
        const payload = editor.payload(true);
        this.drafting.set(true);
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('inventory.stockAdjustment.confirmDraft.title'),
            body: this._translate.instant('inventory.stockAdjustment.confirmDraft.body'),
            ok: this._translate.instant('inventory.stockAdjustment.saveDraft'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) {
                this.drafting.set(false);
                return;
            }
            this._adjustments
                .update(payload)
                .pipe(finalize(() => this.drafting.set(false)))
                .subscribe({
                    next: (changed) => {
                        editor.form.markAsPristine();
                        this._message[changed ? 'success' : 'info'](this._translate.instant(changed ? 'inventory.stockAdjustment.draftSaved' : 'form.nothingChanged'));
                    },
                    error: (error: unknown) => this.fail(error),
                });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(STOCK_ADJUSTMENT_ROUTES.detail(this.oid));
    }

    private fail(error: unknown): void {
        const { key, params } = adjustmentFailure(error, 'form.saveFailed');
        this._message.error(this._translate.instant(key, this.localDigits(params)));
    }

    /** Counts in a message follow the language on screen; codes such as ADJ-2609-0001 are left alone. */
    private localDigits(params: Record<string, unknown>): Record<string, unknown> {
        return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === 'number' ? this._digits.transform(value) : value]));
    }
}
