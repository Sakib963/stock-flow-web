import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePrinter, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { TranslatePipe } from '@ngx-translate/core';
import { StickerContent, StockBatch } from '@app/core/models/stock-overview.model';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { drawSticker, printStickers, STICKER } from '@app/modules/inventory/stock-overview/utils/sticker/sticker';

/** One print run is capped, so a mistyped count cannot send thousands of pages to the printer. */
export const MAX_STICKERS = 500;

/**
 * Barcode stickers for one batch: the sticker at its real size, drawn by the same code that prints
 * it, the number to print, and the printer settings that make it come out right.
 */
@Component({
    selector: 'sticker-dialog',
    imports: [FormsModule, NgIcon, NzButtonModule, NzInputNumberModule, NzModalModule, TranslatePipe, DigitsPipe],
    providers: [provideIcons({ lucidePrinter, lucideX })],
    templateUrl: './sticker-dialog.component.html',
    styleUrl: './sticker-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StickerDialogComponent {
    readonly size = STICKER;
    readonly max = MAX_STICKERS;

    /** The batch to label; null keeps the dialog closed. */
    readonly batch = input<StockBatch | null>(null);
    readonly product = input('');
    readonly business = input('');

    readonly closed = output<void>();

    readonly count = signal(1);

    private readonly _preview = viewChild<ElementRef<HTMLElement>>('preview');

    readonly content = computed<StickerContent | null>(() => {
        const batch = this.batch();
        if (!batch) return null;
        const [year, month, day] = batch.expiry_date?.split('-') ?? [];
        return {
            business: this.business(),
            product: this.product(),
            code: batch.batch_code,
            price: batch.priced && batch.selling_price !== null ? Number(batch.selling_price) : null,
            expiry: batch.expiry_date ? `${day}/${month}/${year}` : null,
        };
    });

    constructor() {
        effect(() => {
            const batch = this.batch();
            if (batch) this.count.set(Math.min(Math.max(batch.on_hand, 1), MAX_STICKERS));
        });
        effect(() => {
            const host = this._preview()?.nativeElement;
            const content = this.content();
            if (!host || !content) return;
            host.replaceChildren(drawSticker(document, content));
        });
    }

    print(): void {
        const content = this.content();
        const count = Math.min(Math.max(Math.floor(this.count() || 1), 1), MAX_STICKERS);
        if (content) printStickers(content, count);
    }
}
