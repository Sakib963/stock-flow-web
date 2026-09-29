import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideRotateCw } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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

/** Editing a Submitted purchase order. Once verified or cancelled it is read only, here as on the server. */
@Component({
    selector: 'purchase-order-edit',
    imports: [NgIcon, NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, PurchaseOrderFormComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideRotateCw })],
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

    readonly record = signal<PurchaseOrderDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    /** The status of an order that can no longer be edited, or null while it still can. */
    readonly closed = computed(() => {
        const status = this.record()?.details.status;
        return status && status !== 'Submitted' ? status.toLowerCase() : null;
    });

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
        if (!editor.form.dirty) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
        if (!editor.valid()) {
            this._message.error(this._translate.instant('form.fixErrors'));
            return;
        }

        const payload = editor.payload();
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('inventory.purchaseOrder.confirmEdit.title'),
            body: this._translate.instant('inventory.purchaseOrder.confirmEdit.body', { number: this.record()?.details.po_number }),
            ok: this._translate.instant('form.saveChanges'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._orders.update(payload).subscribe({
                next: (changed) => {
                    editor.form.markAsPristine();
                    if (changed) this._message.success(this._translate.instant('inventory.purchaseOrder.updated'));
                    else this._message.info(this._translate.instant('form.nothingChanged'));
                    void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.detail(this.oid));
                },
                error: (error: unknown) => this._message.error(this._translate.instant(orderFailureKey(error, 'form.saveFailed'))),
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.detail(this.oid));
    }
}
