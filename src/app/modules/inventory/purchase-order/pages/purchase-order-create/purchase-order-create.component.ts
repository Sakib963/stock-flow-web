import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSave } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PageBack } from '@app/core/models/page-header.model';
import { PurchaseOrderFormComponent } from '@app/modules/inventory/purchase-order/components/purchase-order-form/purchase-order-form.component';
import { PURCHASE_ORDER_ROUTES } from '@app/modules/inventory/purchase-order/constants/purchase-order-routes';
import { PurchaseOrderService } from '@app/modules/inventory/purchase-order/services/purchase-order.service';
import { orderFailureKey } from '@app/modules/inventory/purchase-order/utils/order-failure/order-failure';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';

/** Raising a purchase order. Nothing reaches a warehouse until its delivery is verified. */
@Component({
    selector: 'purchase-order-create',
    imports: [NgIcon, NzButtonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, PurchaseOrderFormComponent],
    providers: [MoneyPipe, provideIcons({ lucideSave })],
    templateUrl: './purchase-order-create.component.html',
    styleUrl: './purchase-order-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _orders = inject(PurchaseOrderService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);
    private readonly _money = inject(MoneyPipe);

    readonly back: PageBack = { route: PURCHASE_ORDER_ROUTES.list };
    readonly editor = viewChild(PurchaseOrderFormComponent);
    private readonly _asking = signal(false);
    readonly saving = computed(() => this._asking() || this._orders.saving());
    /** A draft save, confirmation included, so its button spins rather than Submit. */
    readonly drafting = signal(false);
    readonly submitting = computed(() => this.saving() && !this.drafting());

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.form.dirty;
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.valid()) {
            // With no product picked there is no field to mark, so say what is missing.
            this._message.error(this._translate.instant(editor.started().length ? 'form.fixErrors' : 'inventory.purchaseOrder.needsProduct'));
            return;
        }

        const payload = editor.payload(false);
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('inventory.purchaseOrder.confirmCreate.title'),
            body: this._translate.instant('inventory.purchaseOrder.confirmCreate.body', { count: payload.products.length, total: this._money.transform(editor.total()) }),
            ok: this._translate.instant('inventory.purchaseOrder.submit'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._orders.create(payload).subscribe({
                next: ({ oid, po_number }) => {
                    editor.form.markAsPristine();
                    this._message.success(this._translate.instant('inventory.purchaseOrder.createdMessage', { number: po_number }));
                    void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.detail(oid));
                },
                error: (error: unknown) => this._message.error(this._translate.instant(orderFailureKey(error, 'form.saveFailed'))),
            });
        });
    }

    /**
     * Saves what is typed so far as a Draft, needing only the supplier, and carries on in that draft's
     * edit page so the next save updates it rather than raising a second order.
     */
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
                .create(payload)
                .pipe(finalize(() => this.drafting.set(false)))
                .subscribe({
                    next: ({ oid, po_number }) => {
                        editor.form.markAsPristine();
                        this._message.success(this._translate.instant('inventory.purchaseOrder.draftSavedMessage', { number: po_number }));
                        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.edit(oid), { replaceUrl: true });
                    },
                    error: (error: unknown) => this._message.error(this._translate.instant(orderFailureKey(error, 'form.saveFailed'))),
                });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.list);
    }
}
