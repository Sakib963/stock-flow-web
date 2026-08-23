import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

// Batch picker for ONE known product, used when converting a pre-order.
//
// `select-product` cannot do this job: it searches every batch in the shop by
// free text, and the POS feed it uses accepts only `search_text`. Here the
// product is already fixed by the booking, so the only open question is WHICH
// BATCH fulfils that line. The system must never answer it by guessing, so the
// admin picks from this list and confirms the line explicitly.
@Component({
    selector: 'select-batch-for-line',
    standalone: true,
    imports: [CommonModule, FormsModule, NgZorroCustomModule, LoaderComponent],
    templateUrl: './select-batch-for-line.component.html',
    styleUrl: './select-batch-for-line.component.scss',
})
export class SelectBatchForLineComponent implements OnChanges {
    // The line awaiting a batch: { product_oid, product_name, quantity }
    @Input() line: any = null;
    @Input() visible = false;

    @Output() readonly confirmed: EventEmitter<{ inventory_oid: string; batch: any }> = new EventEmitter();
    @Output() readonly closed: EventEmitter<void> = new EventEmitter();

    private readonly _httpService = inject(HttpService);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _notificationService = inject(NzNotificationService);

    loading = false;
    batches: any[] = [];
    selectedInventoryOid: string | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']?.currentValue && this.line?.product_oid) {
            this.selectedInventoryOid = null;
            this.loadBatches();
        }
    }

    loadBatches(): void {
        this.loading = true;
        this.batches = [];
        this._httpService
            .get(APIEndpoint.GET_BATCHES_FOR_PRODUCT, { product_oid: this.line.product_oid })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this.batches = res.body.data ?? [];
                    }
                },
                error: (err: any) => {
                    this._notificationService.error('Error!', err?.error?.message || 'Unable to load batches');
                },
            });
    }

    // A batch can only fulfil the line if it alone covers the booked quantity;
    // splitting one booked line across batches is out of scope.
    isUsable(batch: any): boolean {
        return Number(batch.sellable_quantity) >= Number(this.line?.quantity || 0);
    }

    onConfirm(): void {
        const batch = this.batches.find((b) => b.inventory_oid === this.selectedInventoryOid);
        if (!batch) {
            this._notificationService.warning('Select a batch', 'Choose which batch fulfils this line');
            return;
        }
        if (!this.isUsable(batch)) {
            this._notificationService.warning('Not enough stock', `This batch has ${batch.sellable_quantity} sellable but the line needs ${this.line.quantity}`);
            return;
        }
        this.confirmed.emit({ inventory_oid: batch.inventory_oid, batch });
    }

    onClose(): void {
        this.closed.emit();
    }
}
