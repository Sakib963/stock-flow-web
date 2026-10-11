import { HttpErrorResponse } from '@angular/common/http';
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
import { PageBack } from '@app/core/models/page-header.model';
import { PreOrderDetails } from '@app/core/models/pre-order.model';
import { PreOrderFormComponent } from '@app/modules/sales/pre-order/components/pre-order-form/pre-order-form.component';
import { PRE_ORDER_ROUTES } from '@app/modules/sales/pre-order/constants/pre-order-routes';
import { PreOrderService } from '@app/modules/sales/pre-order/services/pre-order.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

@Component({
    selector: 'pre-order-edit',
    imports: [NgIcon, NzButtonModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, FormPageComponent, PreOrderFormComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideRotateCw })],
    templateUrl: './pre-order-edit.component.html',
    styleUrl: './pre-order-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreOrderEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _bookings = inject(PreOrderService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    private readonly _oid = this._route.snapshot.paramMap.get('oid') ?? '';

    readonly back: PageBack = { route: PRE_ORDER_ROUTES.detail(this._oid) };
    readonly editor = viewChild(PreOrderFormComponent);
    private readonly _asking = signal(false);
    readonly saving = computed(() => this._asking() || this._bookings.saving());
    readonly booking = signal<PreOrderDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._bookings.details(this._oid).subscribe({
            next: (details) => {
                this.booking.set(details);
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
        const payload = editor.payload(this._oid);
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.preOrder.confirmEdit.title', { number: this.booking()?.preorder_no }),
            body: this._translate.instant('sales.preOrder.confirmEdit.body'),
            ok: this._translate.instant('form.saveChanges'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._bookings.update(payload).subscribe({
                next: (saved) => {
                    editor.markPristine();
                    this._message[saved.changed ? 'success' : 'info'](this._translate.instant(saved.changed ? 'sales.preOrder.updated' : 'form.nothingChanged'));
                    void this._router.navigateByUrl(PRE_ORDER_ROUTES.detail(this._oid));
                },
                error: (error: unknown) => {
                    const refused = error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400) ? (error.error?.message as string | undefined) : undefined;
                    this._message.error(refused ?? this._translate.instant(failureKey(error, 'form.saveFailed')));
                },
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(PRE_ORDER_ROUTES.detail(this._oid));
    }

    backToList(): void {
        void this._router.navigateByUrl(PRE_ORDER_ROUTES.list);
    }
}
