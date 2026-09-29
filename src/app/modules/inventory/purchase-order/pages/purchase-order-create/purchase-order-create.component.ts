import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
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
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, PurchaseOrderFormComponent],
    providers: [MoneyPipe],
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

        const payload = editor.payload();
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

    cancel(): void {
        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.list);
    }
}
