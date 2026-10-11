import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCheck, lucideTrash2, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PosBatch } from '@app/core/models/pos.model';
import { GiveawayService } from '@app/modules/sales/giveaway/services/giveaway.service';
import { ProductSearchComponent } from '@app/shared/components/product-search/product-search.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

interface GiftLine {
    inventory_oid: string;
    product_name: string;
    batch_code: string;
    sellable: number;
    quantity: number;
}

/** Puts a gift in an online order's parcel: held with the order now, given when it is dispatched. */
@Component({
    selector: 'order-gift-dialog',
    imports: [FormsModule, NgIcon, NzButtonModule, NzFormModule, NzInputModule, NzInputNumberModule, NzModalModule, TranslatePipe, ProductSearchComponent, DigitsPipe],
    providers: [provideIcons({ lucideArrowLeft, lucideCheck, lucideTrash2, lucideX })],
    templateUrl: './order-gift-dialog.component.html',
    styleUrl: './order-gift-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderGiftDialogComponent {
    private readonly _giveaways = inject(GiveawayService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);

    readonly orderOid = input.required<string>();
    readonly invoiceNo = input.required<string>();
    readonly visible = model(false);
    readonly added = output<void>();

    readonly saving = this._giveaways.saving;
    readonly lines = signal<GiftLine[]>([]);
    readonly note = signal('');
    readonly confirming = signal(false);
    /** Made once per opening, so a retried Add finds the gift it already added. */
    private _oid = crypto.randomUUID();

    readonly units = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));
    readonly incomplete = computed(() => !this.lines().length || !this.note().trim() || this.lines().some((line) => line.quantity > line.sellable));

    constructor() {
        effect(() => {
            if (!this.visible()) return;
            this.lines.set([]);
            this.note.set('');
            this.confirming.set(false);
            this._oid = crypto.randomUUID();
        });
    }

    add(batch: PosBatch): void {
        if (this.lines().some((line) => line.inventory_oid === batch.inventory_oid)) {
            this.lines.update((all) => all.map((line) => (line.inventory_oid === batch.inventory_oid ? { ...line, quantity: Math.min(line.quantity + 1, line.sellable) } : line)));
            return;
        }
        this.lines.update((all) => [...all, { inventory_oid: batch.inventory_oid, product_name: batch.product_name, batch_code: batch.batch_code, sellable: batch.sellable_quantity, quantity: 1 }]);
    }

    setQuantity(index: number, quantity: number | null): void {
        this.lines.update((all) => all.map((line, i) => (i === index ? { ...line, quantity: Math.max(1, quantity ?? 1) } : line)));
    }

    remove(index: number): void {
        this.lines.update((all) => all.filter((_, i) => i !== index));
    }

    close(): void {
        if (!this.saving()) this.visible.set(false);
    }

    /** Asks inside the same dialog, never a second modal on top. */
    submit(): void {
        if (this.incomplete() || this.saving()) return;
        if (!this.confirming()) {
            this.confirming.set(true);
            return;
        }
        this._giveaways.addToOrder({ oid: this._oid, order_oid: this.orderOid(), note: this.note().trim(), lines: this.lines().map((line) => ({ inventory_oid: line.inventory_oid, quantity: line.quantity })) }).subscribe({
            next: (saved) => {
                this.visible.set(false);
                this._message.success(this._translate.instant('sales.giveaway.order.added', { number: saved.giveaway_no }));
                this.added.emit();
            },
            error: (error: unknown) => {
                this.confirming.set(false);
                const conflict = error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400) ? (error.error?.message as string | undefined) : undefined;
                this._message.error(conflict ?? this._translate.instant(failureKey(error, 'form.saveFailed')));
            },
        });
    }
}
