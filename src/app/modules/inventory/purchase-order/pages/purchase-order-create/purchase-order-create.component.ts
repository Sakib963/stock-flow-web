import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSave } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.form.dirty;
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.valid()) {
            this._message.error(this._translate.instant('form.fixErrors'));
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
     *
     * No confirmation, unlike every other save: a draft moves nothing and is saved again and again
     * over a long order, and a question each time would train people to click through questions.
     */
    saveDraft(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.validDraft()) {
            this._message.error(this._translate.instant('inventory.purchaseOrder.draftNeedsSupplier'));
            return;
        }
        this._orders.create(editor.payload(true)).subscribe({
            next: ({ oid, po_number }) => {
                editor.form.markAsPristine();
                this._message.success(this._translate.instant('inventory.purchaseOrder.draftSavedMessage', { number: po_number }));
                void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.edit(oid), { replaceUrl: true });
            },
            error: (error: unknown) => this._message.error(this._translate.instant(orderFailureKey(error, 'form.saveFailed'))),
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.list);
    }
}
