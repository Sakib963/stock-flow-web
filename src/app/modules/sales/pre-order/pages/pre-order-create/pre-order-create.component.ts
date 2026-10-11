import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PageBack } from '@app/core/models/page-header.model';
import { PreOrderFormComponent } from '@app/modules/sales/pre-order/components/pre-order-form/pre-order-form.component';
import { PRE_ORDER_ROUTES } from '@app/modules/sales/pre-order/constants/pre-order-routes';
import { PreOrderService } from '@app/modules/sales/pre-order/services/pre-order.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

@Component({
    selector: 'pre-order-create',
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, PreOrderFormComponent],
    templateUrl: './pre-order-create.component.html',
    styleUrl: './pre-order-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreOrderCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _bookings = inject(PreOrderService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    readonly back: PageBack = { route: PRE_ORDER_ROUTES.list };
    readonly editor = viewChild(PreOrderFormComponent);
    private readonly _asking = signal(false);
    readonly saving = computed(() => this._asking() || this._bookings.saving());
    /** Made once per page, so a retried Save finds the booking it already saved. */
    private readonly _oid = crypto.randomUUID();

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.dirty();
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.valid()) {
            this._message.error(this._translate.instant('form.fixErrors'));
            return;
        }
        const payload = editor.payload(this._oid);
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.preOrder.confirmCreate.title'),
            body: this._translate.instant('sales.preOrder.confirmCreate.body'),
            ok: this._translate.instant('sales.preOrder.add'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._bookings.create(payload).subscribe({
                next: (saved) => {
                    editor.markPristine();
                    this._message.success(this._translate.instant('sales.preOrder.created', { number: saved.preorder_no }));
                    void this._router.navigateByUrl(PRE_ORDER_ROUTES.detail(saved.oid));
                },
                error: (error: unknown) => {
                    const refused = error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400) ? (error.error?.message as string | undefined) : undefined;
                    this._message.error(refused ?? this._translate.instant(failureKey(error, 'form.saveFailed')));
                },
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(PRE_ORDER_ROUTES.list);
    }
}
