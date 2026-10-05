import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PageBack } from '@app/core/models/page-header.model';
import { SessionService } from '@app/core/services/session/session.service';
import { CustomerFormComponent } from '@app/modules/sales/customer/components/customer-form/customer-form.component';
import { CUSTOMER_ROUTES } from '@app/modules/sales/customer/constants/customer-routes';
import { CustomerService } from '@app/modules/sales/customer/services/customer.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

/** Adding a customer. The form is the shared component; this page saves it and says where to go. */
@Component({
    selector: 'customer-create',
    imports: [TranslatePipe, PageHeaderComponent, FormPageComponent, CustomerFormComponent],
    templateUrl: './customer-create.component.html',
    styleUrl: './customer-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerCreateComponent implements HasUnsavedChanges {
    private readonly _router = inject(Router);
    private readonly _customers = inject(CustomerService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    readonly back: PageBack = { route: CUSTOMER_ROUTES.list };
    readonly editor = viewChild(CustomerFormComponent);
    readonly sellsOnline = inject(SessionService).can('sales.online.view');
    private readonly _asking = signal(false);
    readonly saving = computed(() => this._asking() || this._customers.saving());

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
        const payload = editor.payload();
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.customer.confirmCreate.title'),
            body: this._translate.instant('sales.customer.confirmCreate.body', { name: payload.name }),
            ok: this._translate.instant('sales.customer.add'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._customers.create(payload).subscribe({
                next: (oid) => {
                    editor.markPristine();
                    this._message.success(this._translate.instant('sales.customer.createdMessage'));
                    void this._router.navigateByUrl(CUSTOMER_ROUTES.detail(oid));
                },
                error: (error: unknown) => this.onFailed(error),
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(CUSTOMER_ROUTES.list);
    }

    private onFailed(error: unknown): void {
        const taken = this._customers.phoneTaken(error);
        if (taken) {
            this.editor()?.rejectPhone(taken.owner?.name ?? null);
            this._message.error(this._translate.instant(taken.owner ? 'sales.customer.phoneTakenBy' : 'sales.customer.phoneTaken', { name: taken.owner?.name }));
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }
}
