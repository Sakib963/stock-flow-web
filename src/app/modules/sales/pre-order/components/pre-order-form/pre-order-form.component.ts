import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideClipboardPaste, lucideClock, lucidePackage, lucideReceipt, lucideRotateCw, lucideTrash2, lucideTriangleAlert, lucideUserRound } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { PhoneLookup } from '@app/core/models/online-order.model';
import { ADVANCE_METHODS, AdvanceMethod, OpenBookingLine, PreOrderDetails, PreOrderPayload, PreOrderProduct, PriceHints } from '@app/core/models/pre-order.model';
import { PreOrderService } from '@app/modules/sales/pre-order/services/pre-order.service';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { fromDay, toDay } from '@app/shared/utils/calendar-day/calendar-day';
import { categoryGroups } from '@app/shared/utils/category-groups/category-groups';
import { mobileValidator, normalizePhone } from '@app/shared/utils/phone/phone';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

interface BookedLine extends PriceHints {
    product_oid: string;
    product_name: string;
    sku: string | null;
    sellable: number;
    quantity: number;
    unit_price: number;
}

/**
 * The booking form, rendered by the create page and the edit page. A Confirmed booking keeps its
 * products and units (REQ-05), so `locked` leaves only prices, money, customer and date open.
 */
@Component({
    selector: 'pre-order-form',
    imports: [FormsModule, ReactiveFormsModule, NgIcon, NzButtonModule, NzDatePickerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzSelectModule, NzSpinModule, TranslatePipe, StatusTagComponent, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideCircleCheck, lucideClipboardPaste, lucideClock, lucidePackage, lucideReceipt, lucideRotateCw, lucideTrash2, lucideTriangleAlert, lucideUserRound })],
    templateUrl: './pre-order-form.component.html',
    styleUrl: './pre-order-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreOrderFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _bookings = inject(PreOrderService);

    readonly formId = 'pre-order-form';
    readonly methods = ADVANCE_METHODS;
    readonly expectChoices = [
        { key: 'week', days: 7 },
        { key: 'twoWeeks', days: 14 },
        { key: 'month', days: 30 },
    ] as const;

    readonly editing = input<PreOrderDetails | null>(null);
    readonly submitted = output<void>();

    readonly locked = computed(() => this.editing()?.status === 'Confirmed');
    readonly lines = signal<BookedLine[]>([]);
    private readonly _linesTouched = signal(false);
    readonly tried = signal(false);

    /** Who the phone belongs to: a name when known, null when new, undefined until looked up. */
    readonly known = signal<string | null | undefined>(undefined);
    /** What the lookup said about a known customer: their record with this business and any flag. */
    readonly customer = signal<PhoneLookup | null>(null);
    /** The customer's other open bookings, this one left out. */
    readonly openBookings = signal<OpenBookingLine[]>([]);
    readonly openBookingCount = computed(() => new Set(this.openBookings().map((line) => line.oid)).size);
    /** Per product, where it is already booked for this customer: the warning on its line. */
    readonly alreadyBooked = computed(() => {
        const by = new Map<string, OpenBookingLine[]>();
        for (const line of this.openBookings()) by.set(line.product_oid, [...(by.get(line.product_oid) ?? []), line]);
        return by;
    });

    readonly pasteOpen = signal(false);
    readonly pasteText = signal('');
    readonly reading = signal(false);
    /** What reading the message came to: nothing found, or it failed. Null before and after a good read. */
    readonly pasteResult = signal<'nothing' | 'failed' | null>(null);

    readonly form = this._builder.group({
        phone: ['', [Validators.required, mobileValidator]],
        name: ['', [Validators.maxLength(255)]],
        expected_date: [null as Date | null],
        advance_paid: [0, [Validators.min(0)]],
        advance_method: ['' as AdvanceMethod | ''],
        advance_reference: ['', [Validators.maxLength(64)]],
        notes: ['', [Validators.maxLength(256)]],
    });

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
    readonly total = computed(() => this.lines().reduce((sum, line) => sum + line.quantity * line.unit_price, 0));
    readonly needsName = computed(() => this.known() === null && !this._value().name?.trim());
    readonly needsMethod = computed(() => (this._value().advance_paid ?? 0) > 0 && !this._value().advance_method);
    readonly advanceOver = computed(() => (this._value().advance_paid ?? 0) > this.total());
    readonly units = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));
    readonly advance = computed(() => this._value().advance_paid ?? 0);
    /** What is left to collect when the order is delivered, on the approximate prices. */
    readonly balance = computed(() => Math.max(this.total() - this.advance(), 0));
    readonly remaining = computed(() => [!this._value().phone?.trim(), this.needsName(), !this.lines().length].filter(Boolean).length);

    readonly products = signal<PreOrderProduct[]>([]);
    readonly productGroups = computed(() => categoryGroups(this.products()));
    readonly searching = signal(false);
    /** Cleared right after a pick, so the box is ready for the next product. */
    readonly picked = signal<string | null>(null);
    readonly searchFailed = signal<RequestFailure | null>(null);
    readonly lookupFailed = signal(false);
    private _lastSearch = '';
    private readonly _typed = new Subject<string>();

    constructor() {
        const destroyRef = inject(DestroyRef);
        effect(() => {
            const booking = this.editing();
            if (!booking) return;
            this.form.setValue({
                phone: booking.customer_phone,
                name: '',
                expected_date: fromDay(booking.expected_date),
                advance_paid: booking.advance_paid,
                advance_method: booking.advance_method ?? '',
                advance_reference: booking.advance_reference ?? '',
                notes: booking.notes ?? '',
            });
            this.known.set(booking.customer_name);
            this.lines.set(booking.lines.map(({ oid: _oid, total: _total, ...line }) => line));
            this.form.markAsPristine();
            this._linesTouched.set(false);
        });

        this.form.controls.phone.valueChanges
            .pipe(
                map((raw) => normalizePhone(raw ?? '')),
                distinctUntilChanged(),
                switchMap((phone) => {
                    this.known.set(undefined);
                    this.customer.set(null);
                    this.openBookings.set([]);
                    this.lookupFailed.set(false);
                    if (!phone) return of(undefined);
                    // A failed lookup is not a new customer: `known` stays undefined, so Save waits.
                    return this._bookings.findCustomer(phone).pipe(
                        switchMap((found) =>
                            found.customer
                                ? this._bookings.openBookings(phone).pipe(
                                      catchError(() => of([] as OpenBookingLine[])),
                                      map((open) => ({ found, open }))
                                  )
                                : of({ found, open: [] as OpenBookingLine[] })
                        ),
                        map(({ found, open }) => {
                            this.customer.set(found.customer ? found : null);
                            this.openBookings.set(open.filter((line) => line.oid !== this.editing()?.oid));
                            return found.customer?.name ?? null;
                        }),
                        catchError(() => {
                            this.lookupFailed.set(true);
                            return of(undefined);
                        })
                    );
                }),
                takeUntilDestroyed(destroyRef)
            )
            .subscribe((name) => this.known.set(name));

        this._typed
            .pipe(
                debounceTime(250),
                switchMap((text) =>
                    this._bookings.products(text).pipe(
                        map((rows) => ({ rows, failed: null as RequestFailure | null })),
                        catchError((error: unknown) => of({ rows: [] as PreOrderProduct[], failed: failureOf(error) as RequestFailure | null }))
                    )
                ),
                takeUntilDestroyed(destroyRef)
            )
            .subscribe(({ rows, failed }) => {
                this.searching.set(false);
                this.searchFailed.set(failed);
                this.products.set(rows);
            });
        this.search('');
    }

    /** Fill the phone and name from a message pasted from a chat (the online order's reader). */
    readPaste(): void {
        const text = this.pasteText().trim();
        if (!text || this.reading()) return;
        this.reading.set(true);
        this.pasteResult.set(null);
        this._bookings.readMessage(text).subscribe({
            next: (read) => {
                this.reading.set(false);
                if (!read.phone && !read.name) {
                    this.pasteResult.set('nothing');
                    return;
                }
                if (read.phone) this.form.controls.phone.setValue(read.phone);
                if (read.name) this.form.controls.name.setValue(read.name);
                this.form.markAsDirty();
                this.pasteOpen.set(false);
                this.pasteText.set('');
            },
            error: () => {
                this.reading.set(false);
                this.pasteResult.set('failed');
            },
        });
    }

    search(text: string): void {
        this._lastSearch = text;
        this.searching.set(true);
        this._typed.next(text);
    }

    retrySearch(): void {
        this.search(this._lastSearch);
    }

    retryLookup(): void {
        const phone = this.form.controls.phone.value;
        this.form.controls.phone.setValue('');
        this.form.controls.phone.setValue(phone);
    }

    add(oid: string | null): void {
        this.picked.set(oid);
        setTimeout(() => this.picked.set(null));
        const product = this.products().find((row) => row.product_oid === oid);
        if (!product) return;
        this._linesTouched.set(true);
        if (this.lines().some((line) => line.product_oid === product.product_oid)) {
            this.lines.update((all) => all.map((line) => (line.product_oid === product.product_oid ? { ...line, quantity: line.quantity + 1 } : line)));
            return;
        }
        const { price, ...rest } = product;
        // The price customers actually paid is the best guess; then what it sells at now; then its highest price ever.
        this.lines.update((all) => [...all, { ...rest, quantity: 1, unit_price: product.usual_price ?? product.price_to ?? price }]);
    }

    setQuantity(index: number, quantity: number | null): void {
        this._linesTouched.set(true);
        this.lines.update((all) => all.map((line, i) => (i === index ? { ...line, quantity: Math.max(1, quantity ?? 1) } : line)));
    }

    setPrice(index: number, price: number | null): void {
        this._linesTouched.set(true);
        this.lines.update((all) => all.map((line, i) => (i === index ? { ...line, unit_price: Math.max(0, price ?? 0) } : line)));
    }

    /** Set the date the stock is expected, a number of days from today. */
    expectIn(days: number): void {
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() + days);
        this.form.controls.expected_date.setValue(day);
        this.form.controls.expected_date.markAsDirty();
    }

    /** None, half or all of the approximate total as the advance. */
    advanceShare(share: 0 | 0.5 | 1): void {
        this.form.controls.advance_paid.setValue(Math.round(this.total() * share));
        this.form.controls.advance_paid.markAsDirty();
    }

    remove(index: number): void {
        this._linesTouched.set(true);
        this.lines.update((all) => all.filter((_, i) => i !== index));
    }

    dirty(): boolean {
        return this.form.dirty || this._linesTouched();
    }

    valid(): boolean {
        this.tried.set(true);
        revealErrors(this.form);
        return this.form.valid && !!this.lines().length && !this.needsName() && !this.needsMethod() && !this.advanceOver() && this.known() !== undefined;
    }

    markPristine(): void {
        this.form.markAsPristine();
        this._linesTouched.set(false);
    }

    payload(oid: string): PreOrderPayload {
        const raw = this.form.getRawValue();
        const advance = raw.advance_paid ?? 0;
        return {
            oid,
            customer: { phone: normalizePhone(raw.phone) ?? raw.phone.trim(), name: raw.name.trim() || null },
            lines: this.lines().map((line) => ({ product_oid: line.product_oid, quantity: line.quantity, unit_price: line.unit_price })),
            advance_paid: advance,
            advance_method: advance > 0 ? raw.advance_method || null : null,
            advance_reference: advance > 0 ? raw.advance_reference.trim() || null : null,
            expected_date: toDay(raw.expected_date),
            notes: raw.notes.trim() || null,
        };
    }

    invalid(field: keyof typeof this.form.controls): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }
}
