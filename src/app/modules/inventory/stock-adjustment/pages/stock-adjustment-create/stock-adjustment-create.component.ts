import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { ADJUSTMENT_REASONS, AdjustmentReason } from '@app/core/models/stock-adjustment.model';
import { StockAdjustmentFormComponent } from '@app/modules/inventory/stock-adjustment/components/stock-adjustment-form/stock-adjustment-form.component';
import { STOCK_ADJUSTMENT_ROUTES } from '@app/modules/inventory/stock-adjustment/constants/stock-adjustment-routes';
import { StockAdjustmentService } from '@app/modules/inventory/stock-adjustment/services/stock-adjustment.service';
import { adjustmentFailure } from '@app/modules/inventory/stock-adjustment/utils/adjustment-failure/adjustment-failure';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';

/** A new adjustment. Submitting moves nothing: stock changes only when it is verified, in a separate click. */
@Component({
    selector: 'stock-adjustment-create',
    imports: [NgIcon, NzButtonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, StockAdjustmentFormComponent],
    providers: [DigitsPipe, provideIcons({ lucideSave })],
    templateUrl: './stock-adjustment-create.component.html',
    styleUrl: './stock-adjustment-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustmentCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _adjustments = inject(StockAdjustmentService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);
    private readonly _digits = inject(DigitsPipe);
    private readonly _session = inject(SessionService);

    readonly back: PageBack = { route: STOCK_ADJUSTMENT_ROUTES.list };
    readonly editor = viewChild(StockAdjustmentFormComponent);
    readonly presetReason = this.reasonFromLink();
    private readonly _asking = signal(false);
    readonly saving = computed(() => this._asking() || this._adjustments.saving());
    readonly drafting = signal(false);
    readonly submitting = computed(() => this.saving() && !this.drafting());

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.form.dirty;
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.valid()) {
            this._message.error(this._translate.instant(editor.started().length ? 'form.fixErrors' : 'inventory.stockAdjustment.needsLine'));
            return;
        }
        const payload = editor.payload(false);
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('inventory.stockAdjustment.confirmSubmit.title'),
            body: this._translate.instant('inventory.stockAdjustment.confirmSubmit.body', this.localDigits({ count: payload.lines.length, in: editor.unitsIn(), out: editor.unitsOut() })),
            ok: this._translate.instant('inventory.stockAdjustment.submit'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._adjustments.create(payload).subscribe({
                next: ({ oid, adjustment_number }) => {
                    editor.form.markAsPristine();
                    this._message.success(this._translate.instant('inventory.stockAdjustment.submittedMessage', { number: adjustment_number }));
                    void this._router.navigateByUrl(STOCK_ADJUSTMENT_ROUTES.detail(oid));
                },
                error: (error: unknown) => this.fail(error),
            });
        });
    }

    /** Saves what is typed so far, needing only the reason, and carries on in that draft's edit page. */
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
                .create(payload)
                .pipe(finalize(() => this.drafting.set(false)))
                .subscribe({
                    next: ({ oid, adjustment_number }) => {
                        editor.form.markAsPristine();
                        this._message.success(this._translate.instant('inventory.stockAdjustment.draftSavedMessage', { number: adjustment_number }));
                        // Carry on in the draft, or open its record for someone who may create but not edit.
                        void this._router.navigateByUrl(this._session.can('inventory.stock-adjustment.edit') ? STOCK_ADJUSTMENT_ROUTES.edit(oid) : STOCK_ADJUSTMENT_ROUTES.detail(oid), { replaceUrl: true });
                    },
                    error: (error: unknown) => this.fail(error),
                });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(STOCK_ADJUSTMENT_ROUTES.list);
    }

    private fail(error: unknown): void {
        const { key, params } = adjustmentFailure(error, 'form.saveFailed');
        this._message.error(this._translate.instant(key, this.localDigits(params)));
    }

    private reasonFromLink(): AdjustmentReason | null {
        const reason = inject(ActivatedRoute).snapshot.queryParamMap.get('reason');
        return (ADJUSTMENT_REASONS as readonly string[]).includes(reason ?? '') ? (reason as AdjustmentReason) : null;
    }

    /** Counts in a message follow the language on screen; codes such as ADJ-2609-0001 are left alone. */
    private localDigits(params: Record<string, unknown>): Record<string, unknown> {
        return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === 'number' ? this._digits.transform(value) : value]));
    }
}
