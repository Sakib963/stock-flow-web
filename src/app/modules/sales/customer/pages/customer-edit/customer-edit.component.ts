import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideRotateCw } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { RequestFailure } from '@app/core/models/api.model';
import { Customer } from '@app/core/models/customer.model';
import { PageBack } from '@app/core/models/page-header.model';
import { CustomerFormComponent } from '@app/modules/sales/customer/components/customer-form/customer-form.component';
import { CUSTOMER_ROUTES } from '@app/modules/sales/customer/constants/customer-routes';
import { CustomerService } from '@app/modules/sales/customer/services/customer.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

/** Editing a customer: load them, hand them to the form, save what comes back. Addresses are kept on the record page. */
@Component({
    selector: 'customer-edit',
    imports: [NgIcon, NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, CustomerFormComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideRotateCw })],
    templateUrl: './customer-edit.component.html',
    styleUrl: './customer-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _customers = inject(CustomerService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    private readonly _oid = this._route.snapshot.paramMap.get('oid') ?? '';

    readonly back: PageBack = { route: CUSTOMER_ROUTES.list };
    readonly editor = viewChild(CustomerFormComponent);
    private readonly _asking = signal(false);
    readonly saving = computed(() => this._asking() || this._customers.saving());
    readonly customer = signal<Customer | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._customers.details(this._oid).subscribe({
            next: ({ details }) => {
                this.customer.set(details);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    hasUnsavedChanges(): boolean {
        return !!this.editor()?.dirty();
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;
        if (!editor.dirty()) {
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
            title: this._translate.instant('sales.customer.confirmEdit.title'),
            body: this._translate.instant('sales.customer.confirmEdit.body', { name: payload.name }),
            ok: this._translate.instant('form.saveChanges'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._customers.update(payload).subscribe({
                next: (changed) => {
                    editor.markPristine();
                    this._message[changed ? 'success' : 'info'](this._translate.instant(changed ? 'sales.customer.updated' : 'form.nothingChanged'));
                    void this._router.navigateByUrl(CUSTOMER_ROUTES.detail(this._oid));
                },
                error: (error: unknown) => this.onFailed(error),
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(CUSTOMER_ROUTES.detail(this._oid));
    }

    backToList(): void {
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
