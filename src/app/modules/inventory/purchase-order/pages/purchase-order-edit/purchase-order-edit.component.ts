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
import { PurchaseOrderDetails } from '@app/core/models/purchase-order.model';
import { PurchaseOrderFormComponent } from '@app/modules/inventory/purchase-order/components/purchase-order-form/purchase-order-form.component';
import { PURCHASE_ORDER_ROUTES } from '@app/modules/inventory/purchase-order/constants/purchase-order-routes';
import { PurchaseOrderService } from '@app/modules/inventory/purchase-order/services/purchase-order.service';
import { orderFailureKey } from '@app/modules/inventory/purchase-order/utils/order-failure/order-failure';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/**
 * Editing a Draft or a Submitted purchase order. A Draft is saved again as a draft or submitted; a
 * Submitted order is resubmitted. Once verified or cancelled it is read only, here as on the server.
 */
@Component({
    selector: 'purchase-order-edit',
    imports: [NgIcon, NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, PurchaseOrderFormComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideRotateCw, lucideSave })],
    templateUrl: './purchase-order-edit.component.html',
    styleUrl: './purchase-order-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _orders = inject(PurchaseOrderService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: PURCHASE_ORDER_ROUTES.detail(this.oid) };
    readonly editor = viewChild(PurchaseOrderFormComponent);
    private readonly _asking = signal(false);
    readonly saving = computed(() => this._asking() || this._orders.saving());
    /** A draft save, confirmation included, so its button spins rather than Submit. */
    readonly drafting = signal(false);
    readonly submitting = computed(() => this.saving() && !this.drafting());

    readonly record = signal<PurchaseOrderDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    /** The status of an order that can no longer be edited, or null while it still can. */
    readonly closed = computed(() => {
        const status = this.record()?.details.status;
        return status && status !== 'Submitted' && status !== 'Draft' ? status.toLowerCase() : null;
    });

    readonly draft = computed(() => this.record()?.details.status === 'Draft');
    readonly saveLabel = computed(() => (this.draft() ? 'inventory.purchaseOrder.submit' : 'inventory.purchaseOrder.resubmit'));

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._orders.details(this.oid).subscribe({
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
        // A draft is submitted even when nothing was typed since it was last saved.
        if (!editor.form.dirty && !this.draft()) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
        if (!editor.valid()) {
            // With no product picked there is no field to mark, so say what is missing.
            this._message.error(this._translate.instant(editor.started().length ? 'form.fixErrors' : 'inventory.purchaseOrder.needsProduct'));
            return;
        }

        const payload = editor.payload(false);
        const copy = this.draft() ? 'confirmSubmitDraft' : 'confirmEdit';
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant(`inventory.purchaseOrder.${copy}.title`, { number: this.record()?.details.po_number }),
            body: this._translate.instant(`inventory.purchaseOrder.${copy}.body`, { number: this.record()?.details.po_number }),
            ok: this._translate.instant(this.saveLabel()),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._orders.update(payload).subscribe({
                next: (changed) => {
                    editor.form.markAsPristine();
                    if (changed) this._message.success(this._translate.instant(this.draft() ? 'inventory.purchaseOrder.submittedMessage' : 'inventory.purchaseOrder.updated'));
                    else this._message.info(this._translate.instant('form.nothingChanged'));
                    void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.detail(this.oid));
                },
                error: (error: unknown) => this._message.error(this._translate.instant(orderFailureKey(error, 'form.saveFailed'))),
            });
        });
    }

    /** Saves the draft as it is and stays here, so a long order can be typed over several sittings. */
    saveDraft(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.validDraft()) {
            this._message.error(this._translate.instant('inventory.purchaseOrder.draftNeedsSupplier'));
            return;
        }
        const payload = editor.payload(true);
        this.drafting.set(true);
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('inventory.purchaseOrder.confirmDraft.title'),
            body: this._translate.instant('inventory.purchaseOrder.confirmDraft.body'),
            ok: this._translate.instant('inventory.purchaseOrder.saveDraft'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) {
                this.drafting.set(false);
                return;
            }
            this._orders
                .update(payload)
                .pipe(finalize(() => this.drafting.set(false)))
                .subscribe({
                    next: (changed) => {
                        editor.form.markAsPristine();
                        this._message[changed ? 'success' : 'info'](this._translate.instant(changed ? 'inventory.purchaseOrder.draftSaved' : 'form.nothingChanged'));
                    },
                    error: (error: unknown) => this._message.error(this._translate.instant(orderFailureKey(error, 'form.saveFailed'))),
                });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.detail(this.oid));
    }
}
