import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBanknote, lucidePrinter, lucideCalendarClock, lucideCalendarX, lucideCheck, lucideCircleCheck, lucideCreditCard, lucideEllipsis, lucideEraser, lucideInfo, lucideKeyboard, lucideMinus, lucidePackage, lucidePause, lucidePlay, lucidePlus, lucideRotateCw, lucideScanBarcode, lucideShoppingCart, lucideSmartphone, lucideTrash2, lucideUndo2, lucideUserRound, lucideWallet, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { CartLine, CustomerLookup, PAYMENT_STATUSES, ParkedCart, PaymentMethod, PaymentStatus, PosBatch } from '@app/core/models/pos.model';
import { RequestFailure } from '@app/core/models/api.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ProductSearchComponent } from '@app/modules/sales/pos/components/product-search.component';
import { PosService } from '@app/modules/sales/pos/services/pos.service';
import { CUSTOMER_ROUTES } from '@app/modules/sales/customer/constants/customer-routes';
import { normalizePhone } from '@app/shared/utils/phone/phone';
import { RECEIPT_PAPERS, ReceiptContent, ReceiptPaper, printReceipt } from '@app/modules/sales/pos/utils/receipt/receipt';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { expiryState } from '@app/shared/utils/calendar-day/calendar-day';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { isPhoneWidth, viewportWidth } from '@app/shared/utils/viewport/viewport';

type Lookup = { state: 'idle' } | { state: 'loading' } | { state: 'failed'; kind: RequestFailure } | { state: 'done'; result: CustomerLookup };

/** What the cashier needs once a sale is made: above all, the change to hand back. */
interface SaleDone {
    invoice_no: string;
    total: number;
    paid: number;
    received: number | null;
    change: number | null;
}

/**
 * Function keys only: they type nothing into a field and no browser acts on them on its own, so they
 * work from any field without stealing a keystroke someone meant to type. F5 (reload), F11 and F12
 * are left alone.
 */
export const POS_SHORTCUTS = [
    { key: 'F2', label: 'sales.pos.shortcut.search' },
    { key: 'F4', label: 'sales.pos.shortcut.received' },
    { key: 'F8', label: 'sales.pos.shortcut.park' },
    { key: 'F9', label: 'sales.pos.shortcut.checkout' },
] as const;

/** A line this close to the last of its batch says so, before Checkout finds out. */
const LOW_STOCK_LEFT = 2;

/** The buttons the counter shows. bKash and Nagad sit under MFS, but each sale still records its own wallet. */
const TENDERS = ['cash', 'mfs', 'card', 'other'] as const;
type Tender = (typeof TENDERS)[number];
const WALLETS = ['bkash', 'nagad'] as const;
const TENDER_ICONS: Record<Tender, string> = { cash: 'lucideBanknote', mfs: 'lucideSmartphone', card: 'lucideCreditCard', other: 'lucideEllipsis' };

/**
 * The counter (sales REQ-10 to REQ-24). The page never scrolls on a desktop or tablet: the cart scrolls
 * in its own panel and the total with Checkout is always in view. On a phone the page scrolls and a
 * bar with the total and Checkout stays pinned, opening payment as a sheet.
 *
 * Each cart has an oid chosen here, so a Checkout pressed twice after a lost answer is refused by the
 * server instead of selling twice. Prices shown are the batch's; the server prices the sale again and
 * refuses when the confirmed total no longer matches.
 */
@Component({
    selector: 'pos',
    imports: [FormsModule, RouterLink, NgTemplateOutlet, NgIcon, NzButtonModule, NzDrawerModule, NzInputModule, NzInputNumberModule, NzModalModule, NzPopoverModule, NzRadioModule, NzSwitchModule, NzSkeletonModule, NzSpinModule, NzTableModule, NzTooltipModule, TranslatePipe, PageHeaderComponent, ProductSearchComponent, StatusTagComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [DigitsPipe, MoneyPipe, provideIcons({ lucideBanknote, lucidePrinter, lucideCalendarClock, lucideCalendarX, lucideCheck, lucideCircleCheck, lucideCreditCard, lucideEllipsis, lucideEraser, lucideInfo, lucideKeyboard, lucideMinus, lucidePackage, lucidePause, lucidePlay, lucidePlus, lucideRotateCw, lucideScanBarcode, lucideShoppingCart, lucideSmartphone, lucideTrash2, lucideUndo2, lucideUserRound, lucideWallet, lucideX })],
    templateUrl: './pos.component.html',
    styleUrl: './pos.component.scss',
    host: { class: 'flex min-h-0 flex-col md:h-full', '(document:keydown)': 'shortcut($event)' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosComponent {
    private readonly _pos = inject(PosService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _translate = inject(TranslateService);
    private readonly _digits = inject(DigitsPipe);
    private readonly _money = inject(MoneyPipe);

    readonly language = inject(LanguageService).current;
    /** Selling, parking and the parked carts need `sales.pos.create`; someone who may only open the counter can look products up. */
    private readonly _session = inject(SessionService);
    readonly canSell = this._session.can('sales.pos.create');
    readonly canViewCustomers = this._session.can('sales.customer.view');
    readonly papers = RECEIPT_PAPERS;
    /** Each counter has its own printer, so its paper and whether it prints are remembered on that machine. */
    readonly paper = signal<ReceiptPaper>(remembered('sf.pos.receiptPaper', '58') === '80' ? '80' : '58');
    readonly printAfterCheckout = signal(remembered('sf.pos.printAfterCheckout', 'yes') === 'yes');
    readonly lastReceipt = signal<ReceiptContent | null>(null);
    private readonly _width = viewportWidth();
    readonly isPhone = isPhoneWidth(this._width);
    /** Below a laptop's width the cart's lines are cards: a tablet held upright leaves too little room beside the sider for a table. */
    readonly compact = computed(() => this._width() < 1024);
    /** A finger rather than a mouse: a tablet at the counter gets 44px targets (REQ-12). */
    readonly coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    readonly search = viewChild(ProductSearchComponent);
    readonly tenders = TENDERS;
    readonly wallets = WALLETS;
    readonly statuses = PAYMENT_STATUSES;
    readonly emptySteps = ['sales.pos.emptyStep1', 'sales.pos.emptyStep2', 'sales.pos.emptyStep3'];
    readonly tenderIcons = TENDER_ICONS;
    readonly shortcuts = POS_SHORTCUTS;
    /** A keyboard at a desk; a tablet or a phone has no function keys. */
    readonly showShortcuts = computed(() => this.canSell && !this.coarse && !this.isPhone());

    /** The line a scan or a pick just added to, lit for a moment so the cashier sees it land. */
    readonly flashed = signal<string | null>(null);
    private _flashTimer: ReturnType<typeof setTimeout> | undefined;
    private readonly _linesBox = viewChild<ElementRef<HTMLElement>>('linesBox');

    readonly removed = signal<{ line: CartLine; index: number } | null>(null);
    private readonly _undoTemplate = viewChild.required<TemplateRef<void>>('undoNote');
    private _undoMessage: string | null = null;

    readonly done = signal<SaleDone | null>(null);

    readonly cartOid = signal<string>(crypto.randomUUID());
    /** The parked cart on screen, when one was resumed: Park updates it and Checkout sells it. */
    readonly resumed = signal<ParkedCart | null>(null);
    readonly lines = signal<CartLine[]>([]);

    readonly phone = signal('');
    readonly customerName = signal('');
    /** 'mfs' until a wallet is picked, which Checkout waits for. */
    readonly method = signal<PaymentMethod | 'mfs'>('cash');
    readonly tender = computed<Tender>(() => {
        const method = this.method();
        return method === 'bkash' || method === 'nagad' ? 'mfs' : method;
    });
    readonly status = signal<PaymentStatus>('paid');
    readonly partial = signal<number | null>(null);
    readonly received = signal<number | null>(null);
    readonly reference = signal('');

    readonly parked = signal<ParkedCart[]>([]);
    readonly parkedLoading = signal(true);
    readonly parkedFailed = signal<RequestFailure | null>(null);
    readonly parkedOpen = signal(false);
    readonly parkOpen = signal(false);
    readonly parkLabel = signal('');
    readonly payOpen = signal(false);

    /** A Checkout that got no answer may have sold: until it is answered, nothing on screen claims it did not. */
    readonly unanswered = signal(false);
    private readonly _asking = signal(false);
    readonly checkingOut = signal(false);
    readonly parking = signal(false);
    readonly busy = computed(() => this._asking() || this._pos.saving());

    readonly subtotal = computed(() => this.lines().reduce((sum, line) => sum + line.selling_price * line.quantity, 0));
    readonly discountTotal = computed(() => this.lines().reduce((sum, line) => sum + line.discount * line.quantity, 0));
    readonly total = computed(() => this.subtotal() - this.discountTotal());
    readonly units = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));

    readonly normalizedPhone = computed(() => normalizePhone(this.phone()));
    readonly phoneInvalid = computed(() => !!this.phone().trim() && !this.normalizedPhone());
    readonly lookup = toSignalLookup(this._pos, this.normalizedPhone);
    readonly needsName = computed(() => {
        const lookup = this.lookup();
        return lookup.state === 'done' && !lookup.result.customer;
    });

    readonly change = computed(() => {
        const received = this.received();
        if (this.method() !== 'cash' || this.status() !== 'paid' || received === null) return null;
        return received - this.total();
    });

    /** The exact total and the notes a customer is likely to hand over for it, nearest first. */
    readonly cashSuggestions = computed(() => {
        const total = this.total();
        if (total <= 0) return [];
        const upTo = (note: number) => Math.ceil(total / note) * note;
        return [...new Set([total, upTo(100), upTo(500), upTo(1000), upTo(5000)])].slice(0, 4);
    });

    /** Why Checkout cannot be pressed yet, so the button never sits disabled without saying why. */
    readonly blocker = computed<string | null>(() => {
        if (!this.lines().length) return 'sales.pos.blocker.empty';
        if (this.lines().some((line) => line.quantity > line.sellable)) return 'sales.pos.blocker.stock';
        if (this.method() === 'mfs') return 'sales.pos.blocker.wallet';
        if (this.phoneInvalid()) return 'sales.pos.blocker.phone';
        if (this.lookup().state === 'loading') return 'sales.pos.blocker.lookingUp';
        if (this.needsName() && !this.customerName().trim()) return 'sales.pos.blocker.name';
        if (this.status() !== 'paid' && !this.normalizedPhone()) return 'sales.pos.blocker.creditNeedsPhone';
        if (this.status() === 'partially_paid') {
            const paid = this.partial();
            if (!paid || paid < 1 || paid >= this.total()) return 'sales.pos.blocker.partial';
        }
        if (this.change() !== null && this.change()! < 0) return 'sales.pos.blocker.received';
        return null;
    });

    constructor() {
        if (this.canSell) this.loadParked();
    }

    add(batch: PosBatch): void {
        const at = this.lines().findIndex((line) => line.inventory_oid === batch.inventory_oid);
        if (at >= 0) {
            const line = this.lines()[at];
            if (line.quantity + 1 > batch.sellable_quantity) {
                this.say('warning', 'sales.pos.onlyLeft', { count: this._digits.transform(batch.sellable_quantity), name: batch.product_name });
                return;
            }
            this.patch(at, { quantity: line.quantity + 1, sellable: batch.sellable_quantity, selling_price: batch.selling_price, maximum_discount: batch.maximum_discount });
            this.flash(batch.inventory_oid);
            return;
        }
        this.lines.update((lines) => [
            ...lines,
            {
                inventory_oid: batch.inventory_oid,
                product_oid: batch.product_oid,
                product_name: batch.product_name,
                image_url: batch.image_url,
                batch_code: batch.batch_code,
                expiry_date: batch.expiry_date,
                selling_price: batch.selling_price,
                maximum_discount: batch.maximum_discount,
                sellable: batch.sellable_quantity,
                quantity: 1,
                discount: 0,
            },
        ]);
        this.flash(batch.inventory_oid);
    }

    /** How many more of the batch are left after this line, when that is only a few. */
    lowStock(line: CartLine): number | null {
        const left = line.sellable - line.quantity;
        return left >= 0 && left <= LOW_STOCK_LEFT ? left : null;
    }

    shortcut(event: KeyboardEvent): void {
        if (!this.showShortcuts() || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
        if (!POS_SHORTCUTS.some((shortcut) => shortcut.key === event.key)) return;
        // A dialog or a drawer on screen owns the keyboard: Checkout must never fire from behind one.
        if (this.busy() || this.parkOpen() || this.parkedOpen() || this.done()) return;
        // Cash received is there only for a cash sale paid in full; otherwise F4 is left to the browser.
        const received = event.key === 'F4' ? document.getElementById('pos-received') : null;
        if (event.key === 'F4' && !received) return;
        event.preventDefault();
        if (event.key === 'F2') this.search()?.focus();
        else if (received) received.focus();
        else if (event.key === 'F8') this.openPark();
        else if (event.key === 'F9') this.checkout();
    }

    setTender(tender: Tender): void {
        if (tender !== this.tender()) this.method.set(tender);
    }

    /** In a new tab, so the cart on the counter is never left behind. */
    customerRoute(oid: string): string {
        return CUSTOMER_ROUTES.detail(oid);
    }

    setReceived(amount: number): void {
        this.received.set(amount);
    }

    closeDone(): void {
        this.done.set(null);
        this.search()?.focus();
    }

    focusNewSale(): void {
        document.querySelector<HTMLElement>('[data-pos="new-sale"]')?.focus();
    }

    undoRemove(): void {
        const removed = this.removed();
        this.dropUndo();
        // Added again since it was removed: putting it back would count it twice.
        if (!removed || this.lines().some((line) => line.inventory_oid === removed.line.inventory_oid)) return;
        this.lines.update((lines) => [...lines.slice(0, removed.index), removed.line, ...lines.slice(removed.index)]);
        this.flash(removed.line.inventory_oid);
    }

    step(index: number, by: number): void {
        this.setQuantity(index, this.lines()[index].quantity + by);
    }

    setQuantity(index: number, value: number | string | null): void {
        const quantity = Math.max(1, Math.floor(Number(value) || 1));
        this.patch(index, { quantity });
    }

    setDiscount(index: number, value: number | null): void {
        const line = this.lines()[index];
        this.patch(index, { discount: Math.min(Math.max(0, Math.floor(Number(value) || 0)), this.discountCap(line)) });
    }

    remove(index: number): void {
        const line = this.lines()[index];
        this.lines.update((lines) => lines.filter((_, i) => i !== index));
        this.dropUndo();
        this.removed.set({ line, index });
        this._undoMessage = this._message.info(this._undoTemplate(), { nzDuration: 6000 }).messageId;
    }

    discountCap(line: CartLine): number {
        return Math.min(line.maximum_discount, line.selling_price);
    }

    lineTotal(line: CartLine): number {
        return (line.selling_price - line.discount) * line.quantity;
    }

    expiry(line: CartLine): string {
        return expiryState(line.expiry_date);
    }

    setStatus(status: PaymentStatus): void {
        this.status.set(status);
        if (status !== 'partially_paid') this.partial.set(null);
    }

    clearCart(): void {
        if (!this.lines().length && !this.phone()) return this.newCart();
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.pos.confirmClear.title'),
            body: this._translate.instant(this.unanswered() ? 'sales.pos.confirmClear.bodyUnanswered' : this.resumed() ? 'sales.pos.confirmClear.bodyParked' : 'sales.pos.confirmClear.body'),
            ok: this._translate.instant('sales.pos.clear'),
            cancel: this._translate.instant('form.confirm.cancel'),
            danger: !this.resumed(),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (confirmed) this.newCart();
        });
    }

    checkout(): void {
        if (this.busy()) return;
        const blocker = this.blocker();
        if (blocker) {
            this._message.error(this._translate.instant(blocker));
            return;
        }
        const total = this._money.transform(this.total());
        const change = this.change();
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.pos.confirmCheckout.title', { total }),
            body: [this._translate.instant('sales.pos.confirmCheckout.body', { method: this._translate.instant('sales.pos.method.' + this.method()), status: this._translate.instant('sales.pos.status.' + this.status()) }), change ? this._translate.instant('sales.pos.confirmCheckout.change', { change: this._money.transform(change) }) : ''].filter(Boolean).join(' '),
            ok: this._translate.instant('sales.pos.checkout'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this.checkingOut.set(true);
            const working = this.working('sales.pos.recordingSale');
            const phone = this.normalizedPhone();
            this._pos
                .checkout({
                    oid: this.cartOid(),
                    // The name goes whenever there is a phone: after a failed lookup the page cannot tell a new customer from a known one, and the server ignores it for a known phone.
                    customer: phone ? { phone, name: this.customerName().trim() || null } : undefined,
                    payment_method: this.method() as PaymentMethod,
                    payment_reference: this.method() === 'cash' ? null : this.reference().trim() || null,
                    payment_status: this.status(),
                    amount_paid: this.status() === 'partially_paid' ? (this.partial() ?? 0) : undefined,
                    total_amount: this.total(),
                    lines: this.payloadLines(),
                })
                .subscribe({
                    next: ({ invoice_no, amount_paid }) => {
                        this.checkingOut.set(false);
                        this._message.remove(working);
                        this.unanswered.set(false);
                        this.lastReceipt.set(this.receiptOf(invoice_no, amount_paid));
                        if (this.printAfterCheckout()) this.printLast();
                        const change = this.change();
                        this.done.set({ invoice_no, total: this.total(), paid: amount_paid, received: change !== null ? this.received() : null, change });
                        this.afterCartLeft();
                    },
                    error: (error: unknown) => {
                        this.checkingOut.set(false);
                        this._message.remove(working);
                        this.failCheckout(error);
                    },
                });
        });
    }

    openPark(): void {
        if (!this.lines().length || this.phoneInvalid()) {
            this._message.error(this._translate.instant(this.lines().length ? 'sales.pos.blocker.phone' : 'sales.pos.blocker.empty'));
            return;
        }
        this.parkLabel.set(this.resumed()?.draft_label ?? '');
        this.parkOpen.set(true);
    }

    park(): void {
        if (this.busy()) return;
        this.parking.set(true);
        const working = this.working('sales.pos.parkingCart');
        const done = () => {
            this.parking.set(false);
            this._message.remove(working);
        };
        const phone = this.normalizedPhone();
        this._pos
            .park({
                oid: this.cartOid(),
                draft_label: this.parkLabel().trim() || null,
                customer_name: this.customerName().trim() || this.customerFound()?.name || null,
                customer_phone: phone,
                lines: this.payloadLines(),
            })
            .subscribe({
                next: ({ invoice_no }) => {
                    done();
                    this.parkOpen.set(false);
                    this._message.success(this._translate.instant('sales.pos.parkedMessage', { name: this.parkLabel().trim() || invoice_no }));
                    this.afterCartLeft();
                },
                error: (error: unknown) => {
                    done();
                    this.say('error', this.messageOf(error));
                },
            });
    }

    loadParked(): void {
        this.parkedLoading.set(true);
        this.parkedFailed.set(null);
        this._pos.parkedCarts().subscribe({
            next: (carts) => {
                this.parked.set(carts);
                this.parkedLoading.set(false);
            },
            error: (error: unknown) => {
                this.parkedFailed.set(failureOf(error));
                this.parkedLoading.set(false);
            },
        });
    }

    /** A parked cart replaces an empty screen only, so nothing on screen is ever lost by resuming. */
    canResume(cart: ParkedCart): boolean {
        return !this.lines().length || this.cartOid() === cart.oid;
    }

    resume(cart: ParkedCart): void {
        if (!this.canResume(cart)) return;
        this.reset();
        this.cartOid.set(cart.oid);
        this.resumed.set(cart);
        this.lines.set(cart.lines.map((line) => ({ ...line, discount: Math.min(line.discount, Math.min(line.maximum_discount, line.selling_price)) })));
        this.phone.set(cart.customer_phone ?? '');
        this.customerName.set(cart.customer_name ?? '');
        this.parkedOpen.set(false);
        if (cart.lines.some((line) => line.quantity > line.sellable)) this.say('warning', 'sales.pos.resumedShort');
    }

    discard(cart: ParkedCart): void {
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.pos.confirmDiscard.title', { name: cart.draft_label || cart.invoice_no }),
            body: this._translate.instant('sales.pos.confirmDiscard.body'),
            ok: this._translate.instant('sales.pos.discard'),
            cancel: this._translate.instant('form.confirm.cancel'),
            danger: true,
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._pos.discard(cart.oid).subscribe({
                next: () => {
                    this._message.success(this._translate.instant('sales.pos.discarded'));
                    if (this.cartOid() === cart.oid) this.newCart();
                    this.loadParked();
                },
                error: (error: unknown) => {
                    this.say('error', this.messageOf(error));
                    this.loadParked();
                },
            });
        });
    }

    setPaper(paper: ReceiptPaper): void {
        this.paper.set(paper);
        remember('sf.pos.receiptPaper', paper);
    }

    setPrintAfterCheckout(on: boolean): void {
        this.printAfterCheckout.set(on);
        remember('sf.pos.printAfterCheckout', on ? 'yes' : 'no');
    }

    printLast(): void {
        const receipt = this.lastReceipt();
        if (receipt) printReceipt(receipt, this.paper());
    }

    customerFound(): CustomerLookup['customer'] {
        const lookup = this.lookup();
        return lookup.state === 'done' ? lookup.result.customer : null;
    }

    lookupResult(): CustomerLookup | null {
        const lookup = this.lookup();
        return lookup.state === 'done' ? lookup.result : null;
    }

    /** The receipt for the sale just made, from the cart the server accepted: it priced the same lines to the same total. Built once at the sale, so a reprint keeps its time. */
    private receiptOf(invoice: string, paid: number): ReceiptContent {
        const t = (key: string, params?: Record<string, unknown>) => this._translate.instant('sales.pos.receipt.' + key, params);
        const money = (value: number) => this._money.transform(value);
        const business = this._session.business();
        const customer = this.customerFound()?.name || this.customerName().trim() || this.normalizedPhone();
        const due = this.total() - paid;
        const received = this.change() !== null ? this.received() : null;
        const rows = (...pairs: ([string, string] | null)[]) => pairs.filter((pair): pair is [string, string] => !!pair);
        return {
            business: business?.name ?? '',
            contact: [business?.address, business?.phone].filter((line): line is string => !!line),
            meta: rows([t('invoice'), invoice], [t('date'), new RecordDatePipe().transform(new Date(), this.language(), 'date-time-12')], customer ? [t('customer'), customer] : null),
            lines: this.lines().map((line) => ({
                name: t('item', { name: line.product_name, quantity: this._digits.transform(line.quantity) }),
                amount: money(line.selling_price * line.quantity),
            })),
            totals: this.discountTotal() ? rows([t('subtotal'), money(this.subtotal())], [t('discount'), '-' + money(this.discountTotal())]) : [],
            total: [t('total'), t('amount', { amount: money(this.total()) })],
            payment: rows([t('paidBy'), this._translate.instant('sales.pos.method.' + this.method())], due > 0 ? [t('paid'), money(paid)] : null, due > 0 ? [t('due'), money(due)] : null, received !== null ? [t('received'), money(received)] : null, received !== null ? [t('change'), money(this.change()!)] : null),
            thanks: t('thanks'),
            poweredBy: t('poweredBy'),
        };
    }

    private afterCartLeft(): void {
        this.newCart();
        this.payOpen.set(false);
        this.loadParked();
    }

    private newCart(): void {
        this.reset();
        this.cartOid.set(crypto.randomUUID());
        this.search()?.focus();
    }

    private reset(): void {
        this.dropUndo();
        this.unanswered.set(false);
        this.resumed.set(null);
        this.lines.set([]);
        this.phone.set('');
        this.customerName.set('');
        this.method.set('cash');
        this.status.set('paid');
        this.partial.set(null);
        this.received.set(null);
        this.reference.set('');
    }

    private payloadLines(): { inventory_oid: string; quantity: number; discount: number }[] {
        return this.lines().map(({ inventory_oid, quantity, discount }) => ({ inventory_oid, quantity, discount }));
    }

    private flash(oid: string): void {
        this.flashed.set(oid);
        clearTimeout(this._flashTimer);
        this._flashTimer = setTimeout(() => this.flashed.set(null), 1200);
        setTimeout(() => {
            const rows = this._linesBox()?.nativeElement.querySelectorAll<HTMLElement>('[data-oid]') ?? [];
            Array.from(rows)
                .find((row) => row.dataset['oid'] === oid)
                ?.scrollIntoView?.({ block: 'nearest' });
        });
    }

    /** An undo belongs to the cart it was offered on, never to the next one. */
    private dropUndo(): void {
        this.removed.set(null);
        if (this._undoMessage) this._message.remove(this._undoMessage);
        this._undoMessage = null;
    }

    private patch(index: number, change: Partial<CartLine>): void {
        this.lines.update((lines) => lines.map((line, i) => (i === index ? { ...line, ...change } : line)));
    }

    /**
     * The server's 409s each say what to do: a line that ran out names how many are left and the cart
     * keeps it to reduce; a sale already made (a repeated press) or a cart discarded elsewhere is
     * finished, and the screen moves on; a price that changed leaves the cart for the person to check.
     */
    private failCheckout(error: unknown): void {
        if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400)) {
            const data = error.error?.data ?? {};
            if (typeof data.sellable === 'number' && data.inventory_oid) {
                const at = this.lines().findIndex((line) => line.inventory_oid === data.inventory_oid);
                if (at >= 0) this.patch(at, { sellable: data.sellable });
                const line = this.lines()[at];
                this.say('error', 'sales.pos.onlyLeft', { count: this._digits.transform(data.sellable), name: line?.product_name ?? '' });
                return;
            }
            if (data.status === 'Purchased' && data.invoice_no) {
                // A resumed cart sold at another counter may differ from what is on screen; a repeated press here is the same sale.
                if (this.resumed() && !this.unanswered()) this.say('warning', 'sales.pos.soldElsewhere', { number: data.invoice_no });
                else {
                    // The sale on screen is the one recorded, so its receipt can still be printed.
                    this.lastReceipt.set(this.receiptOf(data.invoice_no, this.status() === 'paid' ? this.total() : this.status() === 'partially_paid' ? (this.partial() ?? 0) : 0));
                    this.say('success', 'sales.pos.alreadySold', { number: data.invoice_no });
                }
                this.afterCartLeft();
                return;
            }
            if (data.status === 'Cancelled') {
                this.say('error', 'sales.pos.cartDiscardedElsewhere');
                this.afterCartLeft();
                return;
            }
            if (typeof data.total_amount === 'number') {
                const prices = new Map<string, number>((data.lines ?? []).map((line: { inventory_oid: string; unit_price: number }) => [line.inventory_oid, line.unit_price]));
                this.lines.update((lines) => lines.map((line) => (prices.has(line.inventory_oid) ? { ...line, selling_price: prices.get(line.inventory_oid)! } : line)));
                this.say('error', 'sales.pos.totalChanged', { total: this._money.transform(data.total_amount) });
                return;
            }
            if (typeof data.maximum_discount === 'number' && data.inventory_oid) {
                const at = this.lines().findIndex((line) => line.inventory_oid === data.inventory_oid);
                if (at >= 0) this.patch(at, { maximum_discount: data.maximum_discount, discount: Math.min(this.lines()[at].discount, data.maximum_discount) });
                this.say('error', 'sales.pos.discountLowered');
                return;
            }
            if (data.field === 'customer.name') {
                this.say('error', 'sales.pos.blocker.name');
                return;
            }
            if (data.field === 'amount_paid') {
                this.say('error', 'sales.pos.blocker.partial');
                return;
            }
        }
        if (error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500)) {
            this.unanswered.set(true);
            this.say('error', 'sales.pos.noAnswer');
            return;
        }
        this.say('error', this.messageOf(error));
    }

    /** A 409 here is the cart itself having moved on; a 400 names the line no longer for sale. Anything else is the request failing. */
    private messageOf(error: unknown): string {
        if (error instanceof HttpErrorResponse && error.status === 409) return 'sales.pos.cartMovedOn';
        if (error instanceof HttpErrorResponse && error.status === 400 && error.error?.data?.inventory_oid) return 'sales.pos.lineNotForSale';
        return failureKey(error, 'form.saveFailed');
    }

    /** Stays until the request answers, so it is removed rather than left to time out. */
    private working(key: string): string {
        return this._message.loading(this._translate.instant(key), { nzDuration: 0 }).messageId;
    }

    private say(kind: 'success' | 'warning' | 'error', key: string, params: Record<string, unknown> = {}): void {
        this._message[kind](this._translate.instant(key, params));
    }
}

/** A preference this counter keeps; storage can be off in a private window, and then the default holds. */
function remembered(key: string, fallback: string): string {
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

function remember(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // A private window without storage keeps the choice for this visit only.
    }
}

/** The customer behind the typed phone, looked up once the number is a whole mobile number. */
function toSignalLookup(pos: PosService, phone: () => string | null) {
    const state = signal<Lookup>({ state: 'idle' });
    toObservable(computed(phone))
        .pipe(
            distinctUntilChanged(),
            switchMap((value) => {
                if (!value) return of<Lookup>({ state: 'idle' });
                state.set({ state: 'loading' });
                return pos.findCustomer(value).pipe(
                    map((result): Lookup => ({ state: 'done', result })),
                    catchError((error: unknown) => of<Lookup>({ state: 'failed', kind: failureOf(error) }))
                );
            }),
            takeUntilDestroyed()
        )
        .subscribe((value) => state.set(value));
    return state.asReadonly();
}
