import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SalesService } from '@app/modules/sales/services/sales.service';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

@Component({
    selector: 'view-return-details',
    imports: [CommonModule, NgZorroCustomModule, FormsModule, PageHeaderComponent, LoaderComponent],
    templateUrl: './view-return-details.component.html',
    styleUrl: './view-return-details.component.scss',
})
export class ViewReturnDetailsComponent {
    private readonly _salesService = inject(SalesService);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _notify = inject(NzNotificationService);
    private readonly _modalService = inject(NzModalService);
    private readonly _router = inject(Router);
    private readonly _route = inject(ActivatedRoute);

    oid: string = '';
    dateFormat = 'dd/MM/yyyy hh:mm a';

    data = signal<any>(null);
    pageLoading = signal(false);
    busy = signal(false);

    // Cancellation is the step back for a return raised by mistake, so it needs a
    // reason on the record rather than a bare confirm.
    cancelVisible = false;
    cancelReason = '';

    // Only a Pending return can still be confirmed or cancelled: after that the
    // stock has already moved and the record is history.
    isPending = computed(() => this.data()?.status === 'Pending');
    canMarkRefunded = computed(() => this.data()?.status === 'Returned');

    statusColor = computed(() => {
        const map: Record<string, string> = { Pending: 'orange', Returned: 'blue', Completed: 'green', Cancelled: 'red' };
        return map[this.data()?.status] || 'default';
    });

    ngOnInit(): void {
        this.oid = this._route.snapshot.paramMap.get('oid') || '';
        this.loadDetails();
    }

    loadDetails(): void {
        this.pageLoading.set(true);
        this._salesService
            .getDetail$(APIEndpoint.GET_RETURN_DETAILS, this.oid)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => this.pageLoading.set(false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this.data.set(res.body.data);
                    }
                },
                error: (err: any) => this._notify.error('Error!', err?.error?.message),
            });
    }

    // --- Lifecycle actions ---

    confirmReturn(): void {
        const d = this.data();
        const restock = (d?.items || []).filter((i: any) => i.condition === 'Good').reduce((s: number, i: any) => s + Number(i.return_quantity), 0);
        const dispose = (d?.items || []).filter((i: any) => i.condition === 'Damaged').reduce((s: number, i: any) => s + Number(i.return_quantity), 0);
        const effect = [restock ? `${restock} unit(s) back into stock` : '', dispose ? `${dispose} damaged unit(s) written off` : ''].filter(Boolean).join(' and ');

        this.showConfirmation(`Confirm ${d?.return_no}? This puts ${effect}. It cannot be undone.`, () => {
            this.act(APIEndpoint.CONFIRM_RETURN, { oid: this.oid }, 'Return confirmed');
        });
    }

    openCancel(): void {
        this.cancelReason = '';
        this.cancelVisible = true;
    }

    submitCancel(): void {
        if (!this.cancelReason.trim()) {
            this._notify.warning('Reason required', 'Say why this return is being withdrawn');
            return;
        }
        this.act(APIEndpoint.CANCEL_RETURN, { oid: this.oid, reason: this.cancelReason.trim() }, 'Return cancelled', () => (this.cancelVisible = false));
    }

    markRefunded(): void {
        const d = this.data();
        this.showConfirmation(`Mark the ${d?.refund_amount} refund on ${d?.return_no} as paid back to the customer?`, () => {
            this.act(APIEndpoint.MARK_RETURN_REFUNDED, { oid: this.oid }, 'Refund marked as settled');
        });
    }

    private showConfirmation(message: string, onOk: () => void): void {
        this._modalService.create({
            nzContent: ConfirmationModalComponent,
            nzData: { message },
            nzFooter: null,
            nzClosable: false,
            nzOnOk: onOk,
        });
    }

    private act(url: string, payload: any, successMessage: string, after?: () => void): void {
        this.busy.set(true);
        this._salesService
            .postAction$(url, payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => this.busy.set(false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this._notify.success('Success', successMessage);
                        after?.();
                        this.loadDetails();
                    }
                },
                error: (err: any) => this._notify.error('Error!', err?.error?.message),
            });
    }

    // --- Navigation ---

    goToOrder(): void {
        this._router.navigate([`/sales/orders/view/${this.data()?.order_oid}`]);
    }

    goToDisposal(): void {
        this._router.navigate([`/inventory/product-dispose/${this.data()?.dispose_oid}`]);
    }
}
