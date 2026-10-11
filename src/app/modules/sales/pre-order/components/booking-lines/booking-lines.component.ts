import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarClock, lucideChevronDown, lucideCircleCheck, lucideSearch, lucideTriangleAlert } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { ConversionLine } from '@app/core/models/pre-order.model';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';

/**
 * The pre-order being converted, as one bar above the cart so the order keeps its room however many
 * products were pre-ordered (the user, 2026-10-11). The list opens in a popover, the products still to
 * add first; a tap searches for one and the moderator picks its batch as usual (pre-order REQ-07). The
 * pre-order price is a hint only.
 */
@Component({
    selector: 'booking-lines',
    imports: [NgIcon, NzButtonModule, NzPopoverModule, NzTooltipModule, TranslatePipe, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideCalendarClock, lucideChevronDown, lucideCircleCheck, lucideSearch, lucideTriangleAlert })],
    templateUrl: './booking-lines.component.html',
    styleUrl: './booking-lines.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingLinesComponent {
    readonly preorderNo = input.required<string>();
    readonly lines = input.required<ConversionLine[]>();
    /** Units of each product already in the order. */
    readonly inOrder = input.required<Map<string, number>>();
    readonly find = output<ConversionLine>();

    readonly listOpen = signal(false);

    /** Still to add, the ones that can be added now first: a product with no stock waits at the end. */
    readonly waiting = computed(() =>
        this.lines()
            .filter((line) => !this.done(line))
            .sort((a, b) => Number(!a.batches.length) - Number(!b.batches.length))
    );
    /** Every product for the list, the ones still to add first. */
    readonly ordered = computed(() => [...this.waiting(), ...this.lines().filter((line) => this.done(line))]);
    readonly left = computed(() => this.waiting().length);
    /** Still to add and without enough sellable stock now, so the order cannot be made yet (all products go together). */
    readonly notInStock = computed(() =>
        this.waiting()
            .filter((line) => line.batches.reduce((sum, batch) => sum + batch.sellable_quantity, 0) < line.quantity - this.units(line))
            .map((line) => line.product_name)
    );

    units(line: ConversionLine): number {
        return this.inOrder().get(line.product_oid) ?? 0;
    }

    done(line: ConversionLine): boolean {
        return this.units(line) >= line.quantity;
    }

    pick(line: ConversionLine): void {
        this.listOpen.set(false);
        this.find.emit(line);
    }
}
