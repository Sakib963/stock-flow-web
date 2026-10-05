import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEraser, lucideExternalLink, lucideFileClock, lucideHistory, lucidePlay, lucideCheck, lucideCircleAlert, lucideCircleCheck, lucideClipboardPaste, lucideMapPin, lucideMinus, lucidePackage, lucidePencil, lucidePlus, lucidePrinter, lucideRotateCw, lucideScanText, lucideSend, lucideSettings2, lucideTrash2, lucideTriangleAlert, lucideUserRound, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { Constants } from '@app/core/constants/constants';
import { RequestFailure } from '@app/core/models/api.model';
import { AddressPayload, Place, CUSTOMER_AGE_BANDS, CUSTOMER_GENDERS, CustomerAddress, CustomerAgeBand, CustomerGender } from '@app/core/models/customer.model';
import { ChatReading, OnlineDraft, OnlineOrderSetup, PAYMENT_TERMS, PaymentTerms, PhoneLookup, PlaceCandidate } from '@app/core/models/online-order.model';
import { CartLine, PAYMENT_METHODS, PaymentMethod, PosBatch } from '@app/core/models/pos.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { AddressFormComponent } from '@app/modules/sales/customer/components/address-form/address-form.component';
import { CUSTOMER_ROUTES } from '@app/modules/sales/customer/constants/customer-routes';
import { OnlineOrderService } from '@app/modules/sales/online-order/services/online-order.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { ProductSearchComponent } from '@app/shared/components/product-search/product-search.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { ProductSearchService } from '@app/core/services/product-search/product-search.service';
import { environment } from '@env/environment';
import { InvoiceContent, printInvoice } from '@app/shared/utils/invoice/invoice';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { normalizePhone } from '@app/shared/utils/phone/phone';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { viewportWidth } from '@app/shared/utils/viewport/viewport';

type Lookup = { state: 'idle' } | { state: 'loading' } | { state: 'failed'; kind: RequestFailure } | { state: 'done'; result: PhoneLookup };

/** A new address with the names of its places, so it reads as a place before it is saved. */
type NewAddress = AddressPayload & { district_name_en: string; district_name_bn: string; thana_name_en: string; thana_name_bn: string };

/** What the pasted message said about the address, kept until the moderator settles the place. */
interface Pasted {
    line: string;
    area: string | null;
    // The pasted phone's customer, or the name the message gave: the lookup may not have answered yet.
    recipient_name: string;
    // The pasted phone's saved addresses, from the same answer, so a repeat is matched before the lookup returns.
    saved: CustomerAddress[];
    recipient_phone: string | null;
    postal_code: string | null;
    candidates: PlaceCandidate[];
}

/** The part of the page each reason points at, lit for a moment when Create is pressed too early. */
const BLOCKER_PART: Record<string, Part> = { phone: 'customer', phoneInvalid: 'customer', lookingUp: 'customer', name: 'customer', address: 'customer', empty: 'products', stock: 'products', source: 'summary', advance: 'summary', blocked: 'summary' };
type Part = 'customer' | 'products' | 'summary';
type RequiredField = 'phone' | 'name' | 'source' | 'advance';
/** Blockers a form field shows under itself, so they need no message as well. */
const FIELD_BLOCKERS = ['phone', 'phoneInvalid', 'name', 'source', 'advance'];

const OPEN_STATUSES = ['Pending', 'Confirmed'];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The online order (sales REQ-30 to REQ-43). Phone first: a known phone brings its saved addresses,
 * a pasted chat message fills phone, name and address, and the place is always settled by the
 * moderator from ranked candidates. Prices are the batch's and the server prices the order again;
 * Create holds the stock and nothing leaves the shelf until dispatch.
 *
 * Each order has an oid chosen here, so a Create pressed again after a lost answer is refused by the
 * server instead of placing the order twice.
 */
@Component({
    selector: 'online-order',
    imports: [FormsModule, RouterLink, NgTemplateOutlet, NgIcon, NzButtonModule, NzCheckboxModule, NzDrawerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzModalModule, NzPopoverModule, NzRadioModule, NzSelectModule, NzSkeletonModule, NzSpinModule, NzTableModule, NzTooltipModule, NzTypographyModule, TranslatePipe, PageHeaderComponent, ProductSearchComponent, StatusTagComponent, AddressFormComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [DigitsPipe, MoneyPipe, provideIcons({ lucideEraser, lucideExternalLink, lucideFileClock, lucideHistory, lucidePlay, lucideCheck, lucideCircleAlert, lucideCircleCheck, lucideClipboardPaste, lucideMapPin, lucideMinus, lucidePackage, lucidePencil, lucidePlus, lucidePrinter, lucideRotateCw, lucideScanText, lucideSend, lucideSettings2, lucideTrash2, lucideTriangleAlert, lucideUserRound, lucideX })],
    templateUrl: './online-order.component.html',
    styleUrl: './online-order.component.scss',
    host: { class: 'flex min-h-0 flex-col lg:h-full' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineOrderComponent {
    private readonly _orders = inject(OnlineOrderService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _translate = inject(TranslateService);
    private readonly _digits = inject(DigitsPipe);
    private readonly _money = inject(MoneyPipe);
    private readonly _session = inject(SessionService);
    private readonly _products = inject(ProductSearchService);

    readonly language = inject(LanguageService).current;
    readonly canCreate = this._session.can('sales.online.create');
    readonly canViewCustomers = this._session.can('sales.customer.view');
    readonly canEditCharges = this._session.can('sales.settings.edit');
    readonly customerRoute = CUSTOMER_ROUTES;
    private readonly _width = viewportWidth();
    /** Below a laptop's width the three columns stack and the page scrolls, so the total and Create stay pinned (REQ-30). */
    readonly stacked = computed(() => this._width() < 1024);
    /** The products column is wide enough for a table from here; below it each line is a card. */
    readonly wide = computed(() => this._width() >= 1600);
    readonly genders = CUSTOMER_GENDERS;
    readonly ageBands = CUSTOMER_AGE_BANDS;
    readonly terms = PAYMENT_TERMS;
    readonly methods = PAYMENT_METHODS;
    readonly search = viewChild(ProductSearchComponent);
    readonly addressForm = viewChild(AddressFormComponent);

    readonly setup = signal<OnlineOrderSetup | null>(null);
    readonly setupFailed = signal<RequestFailure | null>(null);

    readonly orderOid = signal<string>(crypto.randomUUID());
    readonly phone = signal('');
    readonly customerName = signal('');
    readonly gender = signal<CustomerGender | null>(null);
    readonly ageBand = signal<CustomerAgeBand | null>(null);

    readonly pasteOpen = signal(false);
    readonly pasteText = signal('');
    readonly reading = signal(false);
    readonly pasted = signal<Pasted | null>(null);

    /** A saved address's oid, or 'new' for the one in `newAddress`. */
    readonly addressChoice = signal<string | null>(null);
    readonly newAddress = signal<NewAddress | null>(null);
    readonly addressOpen = signal(false);
    readonly addressSeed = signal<CustomerAddress | null>(null);

    readonly chargesOpen = signal(false);
    readonly chargesSaving = signal(false);
    readonly chargesDistrict = signal<string | null>(null);
    readonly chargesInside = signal<number | null>(null);
    readonly chargesOutside = signal<number | null>(null);
    readonly districtChoices = signal<Place[]>([]);
    readonly districtsLoading = signal(false);

    readonly draftsOpen = signal(false);
    readonly drafts = signal<OnlineDraft[]>([]);
    readonly draftsLoading = signal(false);
    readonly savingDraft = signal(false);
    /** A resumed draft's saved address, chosen once the phone's lookup answers. */
    private _resumeAddress: string | null = null;

    readonly lines = signal<CartLine[]>([]);
    readonly sourceOid = signal<string | null>(null);
    /** Typed by hand; until then the charge follows the district (REQ-39). */
    readonly chargeTyped = signal<number | null>(null);
    readonly paymentType = signal<PaymentTerms>('COD');
    readonly method = signal<PaymentMethod>('bkash');
    readonly advance = signal<number | null>(null);
    readonly reference = signal('');
    readonly notes = signal('');
    readonly blockedAcknowledged = signal(false);

    private readonly _asking = signal(false);
    readonly creating = signal(false);
    /** A Create that got no answer may have placed the order: until it is answered, nothing on screen claims it did not. */
    readonly unanswered = signal(false);
    readonly done = signal<{ invoice_no: string; total: number; collect: number; customer_oid: string } | null>(null);
    /** Something typed that a reload or Clear would lose. */
    readonly dirty = computed(() => !!(this.phone().trim() || this.lines().length || this.notes().trim()));
    /** Create was pressed with a field still empty: from then the empty required fields show their errors. */
    readonly tried = signal(false);
    readonly attention = signal<Part | null>(null);
    private _attentionTimer?: ReturnType<typeof setTimeout>;
    readonly lastInvoice = signal<InvoiceContent | null>(null);
    readonly busy = computed(() => this._asking() || this._orders.saving());

    readonly normalizedPhone = computed(() => normalizePhone(this.phone()));
    readonly phoneInvalid = computed(() => !!this.phone().trim() && !this.normalizedPhone());
    readonly lookup = lookupOf(this._orders, this.normalizedPhone);
    readonly found = computed(() => {
        const lookup = this.lookup();
        return lookup.state === 'done' ? lookup.result : null;
    });
    readonly customer = computed(() => this.found()?.customer ?? null);
    readonly savedAddresses = computed(() => this.found()?.addresses ?? []);
    readonly isNewCustomer = computed(() => this.lookup().state === 'done' && !this.customer());
    /** An open order for the same phone in the last day: the same chat often produces two (REQ-43). */
    readonly recentOpen = computed(() => (this.found()?.last_orders ?? []).find((order) => OPEN_STATUSES.includes(order.status) && Date.now() - new Date(order.created_on).getTime() < DAY_MS) ?? null);

    readonly chosenAddress = computed(() => {
        const choice = this.addressChoice();
        if (choice === 'new') return this.newAddress();
        return this.savedAddresses().find((address) => address.oid === choice) ?? null;
    });
    readonly districtOid = computed(() => this.chosenAddress()?.district_oid ?? null);
    readonly suggestedCharge = computed(() => {
        const setup = this.setup();
        if (!setup) return 0;
        const district = this.districtOid();
        if (!district) return setup.delivery_charge_inside;
        return setup.home_district && district !== setup.home_district.oid ? setup.delivery_charge_outside : setup.delivery_charge_inside;
    });
    readonly deliveryCharge = computed(() => this.chargeTyped() ?? this.suggestedCharge());

    readonly subtotal = computed(() => this.lines().reduce((sum, line) => sum + line.selling_price * line.quantity, 0));
    readonly discountTotal = computed(() => this.lines().reduce((sum, line) => sum + line.discount * line.quantity, 0));
    readonly total = computed(() => this.subtotal() - this.discountTotal() + this.deliveryCharge());
    readonly paid = computed(() => (this.paymentType() === 'PREPAID' ? this.total() : this.paymentType() === 'ADVANCE' ? (this.advance() ?? 0) : 0));
    /** What the courier collects at the door: the total less what was paid (REQ-116). */
    readonly collect = computed(() => Math.max(0, this.total() - this.paid()));
    readonly units = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));

    /** Why Create cannot be pressed yet, so the button never sits disabled without saying why. */
    readonly blocker = computed<string | null>(() => {
        if (!this.normalizedPhone()) return this.phoneInvalid() ? 'sales.online.blocker.phoneInvalid' : 'sales.online.blocker.phone';
        if (this.lookup().state === 'loading') return 'sales.online.blocker.lookingUp';
        if (this.isNewCustomer() && !this.customerName().trim()) return 'sales.online.blocker.name';
        if (!this.chosenAddress()) return 'sales.online.blocker.address';
        if (!this.lines().length) return 'sales.online.blocker.empty';
        if (this.lines().some((line) => line.quantity > line.sellable)) return 'sales.online.blocker.stock';
        if (!this.sourceOid()) return 'sales.online.blocker.source';
        if (this.paymentType() === 'ADVANCE') {
            const advance = this.advance();
            if (!advance || advance < 1 || advance >= this.total()) return 'sales.online.blocker.advance';
        }
        if (this.customer()?.flag === 'Blocked' && !this.blockedAcknowledged()) return 'sales.online.blocker.blocked';
        return null;
    });

    missing(field: RequiredField): boolean {
        if (!this.tried()) return false;
        switch (field) {
            case 'phone':
                return !this.normalizedPhone() && !this.phoneInvalid();
            case 'name':
                return this.isNewCustomer() && !this.customerName().trim();
            case 'source':
                return !this.sourceOid();
            case 'advance':
                return this.blocker() === 'sales.online.blocker.advance';
        }
    }

    constructor() {
        this.loadSetup();
        this.restore();
        // What is typed is kept in this browser, so a reload by mistake loses nothing (the user, 2026-10-05).
        effect(() => remember(UNSENT_KEY, this.dirty() ? this.snapshot() : null));
        // A known phone starts on its default address; a new one waits for the moderator to add one.
        toObservable(this.lookup)
            .pipe(takeUntilDestroyed())
            .subscribe((lookup) => {
                if (lookup.state !== 'done') return;
                const saved = lookup.result.addresses ?? [];
                if (this._resumeAddress && saved.some((address) => address.oid === this._resumeAddress)) {
                    this.addressChoice.set(this._resumeAddress);
                    this._resumeAddress = null;
                } else if (this.addressChoice() !== 'new' && !saved.some((address) => address.oid === this.addressChoice())) this.addressChoice.set(saved.find((address) => address.is_default)?.oid ?? saved[0]?.oid ?? (this.newAddress() ? 'new' : null));
                this.blockedAcknowledged.set(false);
            });
    }

    loadSetup(): void {
        this.setupFailed.set(null);
        this._orders.setup().subscribe({
            next: (setup) => {
                this.setup.set(setup);
                if (setup.sources.length === 1) this.sourceOid.set(setup.sources[0].oid);
            },
            error: (error: unknown) => this.setupFailed.set(failureOf(error)),
        });
    }

    placeName(place: { name_en: string; name_bn: string }): string {
        return this.language() === 'bn' ? place.name_bn : place.name_en;
    }

    /** The order helper: one call returns what the message says and who the phone belongs to (REQ-34). */
    readMessage(): void {
        const text = this.pasteText().trim();
        if (!text || this.reading()) return;
        this.reading.set(true);
        this._orders.readMessage(text).subscribe({
            next: (reading) => {
                this.reading.set(false);
                this.pasteOpen.set(false);
                this.applyReading(reading);
            },
            error: (error: unknown) => {
                this.reading.set(false);
                this._message.error(this._translate.instant('sales.online.paste.failed.' + failureOf(error)));
            },
        });
    }

    private applyReading(reading: ChatReading): void {
        if (reading.phone) this.phone.set(reading.phone);
        if (reading.name && !reading.lookup?.customer) this.customerName.set(reading.name);
        if (!reading.phone) this._message.warning(this._translate.instant('sales.online.paste.noPhone'));
        if (!reading.address_line) return;
        const candidates = reading.location?.candidates ?? [];
        this.pasted.set({ line: reading.address_line, area: reading.area ?? null, saved: reading.lookup?.addresses ?? [], recipient_name: reading.lookup?.customer?.name ?? reading.name ?? '', recipient_phone: reading.other_phones[0] ?? null, postal_code: reading.location?.postal_code ?? null, candidates });
        // One candidate clearly ahead is taken; a tie waits for the moderator (REQ-35).
        const first = candidates[0];
        if (first?.thana && candidates.filter((candidate) => candidate.rank === 1).length === 1) this.useCandidate(first);
    }

    useCandidate(candidate: PlaceCandidate): void {
        const pasted = this.pasted();
        if (!pasted) return;
        const seed: CustomerAddress = {
            oid: '',
            label: null,
            recipient_name: this.customer()?.name ?? (this.customerName().trim() || pasted.recipient_name),
            recipient_phone: pasted.recipient_phone,
            address_line: pasted.line,
            district_oid: candidate.district.oid,
            district_name_en: candidate.district.name_en,
            district_name_bn: candidate.district.name_bn,
            thana_oid: candidate.thana?.oid ?? '',
            thana_name_en: candidate.thana?.name_en ?? '',
            thana_name_bn: candidate.thana?.name_bn ?? '',
            area_text: candidate.area ? this.placeName(candidate.area) : pasted.area,
            postal_code: pasted.postal_code,
            is_default: false,
        };
        // The same place and line as a saved address is that address, not a second copy of it.
        const same = [...this.savedAddresses(), ...pasted.saved].find((address) => address.thana_oid === seed.thana_oid && sameLine(address.address_line, seed.address_line));
        if (same) {
            this.newAddress.set(null);
            return this.addressChoice.set(same.oid);
        }
        // A place without its thana, or a parcel with nobody named to receive it, is finished in the form.
        if (!candidate.thana || !seed.recipient_name) return this.openAddress(seed);
        const { oid, ...address } = seed;
        this.newAddress.set(address);
        this.addressChoice.set('new');
    }

    isPicked(candidate: PlaceCandidate): boolean {
        const address = this.newAddress();
        return this.addressChoice() === 'new' && !!address && address.district_oid === candidate.district.oid && address.thana_oid === (candidate.thana?.oid ?? '');
    }

    openAddress(seed: CustomerAddress | null = null): void {
        const current = this.newAddress();
        this.addressSeed.set(seed ?? (current ? { ...current, oid: '' } : { oid: '', label: null, recipient_name: this.customer()?.name ?? this.customerName().trim(), recipient_phone: null, address_line: this.pasted()?.line ?? '', district_oid: '', district_name_en: '', district_name_bn: '', thana_oid: '', thana_name_en: '', thana_name_bn: '', area_text: null, postal_code: null, is_default: false }));
        this.addressOpen.set(true);
    }

    saveAddress(): void {
        const form = this.addressForm();
        if (!form?.valid()) return;
        const payload = form.payload();
        const district = form.districts().find((place) => place.oid === payload.district_oid);
        const thana = form.thanas().find((place) => place.oid === payload.thana_oid);
        this.newAddress.set({ ...payload, district_name_en: district?.name_en ?? '', district_name_bn: district?.name_bn ?? '', thana_name_en: thana?.name_en ?? '', thana_name_bn: thana?.name_bn ?? '' });
        this.addressChoice.set('new');
        this.addressOpen.set(false);
    }

    openCharges(): void {
        const setup = this.setup()!;
        this.districtChoices.set(setup.home_district ? [setup.home_district] : []);
        this.chargesDistrict.set(setup.home_district?.oid ?? null);
        this.chargesInside.set(setup.delivery_charge_inside || null);
        this.chargesOutside.set(setup.delivery_charge_outside || null);
        this.chargesOpen.set(true);
        if (this.districtChoices().length > 1) return;
        this.districtsLoading.set(true);
        this._orders.districts().subscribe({
            next: (places) => {
                this.districtsLoading.set(false);
                this.districtChoices.set(places);
            },
            error: (error: unknown) => {
                this.districtsLoading.set(false);
                this._message.error(this._translate.instant('sales.online.charges.placesFailed.' + failureOf(error)));
            },
        });
    }

    /** The business's own district and its two charges; an order's charge can still be changed on the order (REQ-39). */
    saveCharges(): void {
        const [district, inside, outside] = [this.chargesDistrict(), this.chargesInside(), this.chargesOutside()];
        if (!district || inside === null || outside === null || this.chargesSaving()) {
            this._message.warning(this._translate.instant('sales.online.charges.incomplete'));
            return;
        }
        this.chargesSaving.set(true);
        this._orders.saveDeliveryCharges({ home_district_oid: district, delivery_charge_inside: inside, delivery_charge_outside: outside }).subscribe({
            next: (saved) => {
                this.chargesSaving.set(false);
                this.setup.update((setup) => (setup ? { ...setup, ...saved } : setup));
                this.chargeTyped.set(null);
                this.chargesOpen.set(false);
                this._message.success(this._translate.instant('sales.online.charges.saved'));
            },
            error: (error: unknown) => {
                this.chargesSaving.set(false);
                this._message.error(error instanceof HttpErrorResponse && error.status === 400 && error.error?.message ? error.error.message : this._translate.instant('sales.online.charges.failed.' + failureOf(error)));
            },
        });
    }

    add(batch: PosBatch): void {
        const at = this.lines().findIndex((line) => line.inventory_oid === batch.inventory_oid);
        if (at >= 0) {
            const line = this.lines()[at];
            if (line.quantity + 1 > batch.sellable_quantity) {
                this.say('warning', 'sales.online.onlyLeft', { count: this._digits.transform(batch.sellable_quantity), name: batch.product_name });
                return;
            }
            this.patch(at, { quantity: line.quantity + 1, sellable: batch.sellable_quantity, selling_price: batch.selling_price, maximum_discount: batch.maximum_discount });
            return;
        }
        this.lines.update((lines) => [...lines, { inventory_oid: batch.inventory_oid, product_oid: batch.product_oid, product_name: batch.product_name, image_url: batch.image_url, batch_code: batch.batch_code, expiry_date: batch.expiry_date, selling_price: batch.selling_price, maximum_discount: batch.maximum_discount, sellable: batch.sellable_quantity, quantity: 1, discount: 0 }]);
    }

    step(index: number, by: number): void {
        this.patch(index, { quantity: Math.max(1, this.lines()[index].quantity + by) });
    }

    setQuantity(index: number, value: number | string | null): void {
        this.patch(index, { quantity: Math.max(1, Math.floor(Number(value) || 1)) });
    }

    setDiscount(index: number, value: number | null): void {
        const line = this.lines()[index];
        this.patch(index, { discount: Math.min(Math.max(0, Math.floor(Number(value) || 0)), this.discountCap(line)) });
    }

    remove(index: number): void {
        this.lines.update((lines) => lines.filter((_, i) => i !== index));
    }

    discountCap(line: CartLine): number {
        return Math.min(line.maximum_discount, line.selling_price);
    }

    lineTotal(line: CartLine): number {
        return (line.selling_price - line.discount) * line.quantity;
    }

    setCharge(value: number | null): void {
        this.chargeTyped.set(value === null ? null : Math.max(0, Math.floor(Number(value) || 0)));
    }

    setPaymentType(terms: PaymentTerms): void {
        this.paymentType.set(terms);
        if (terms !== 'ADVANCE') this.advance.set(null);
    }

    create(): void {
        if (this.busy() || !this.canCreate) return;
        const blocker = this.blocker();
        if (blocker) return this.pointAt(blocker);
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.online.confirmCreate.title', { total: this._money.transform(this.total()) }),
            body: this._translate.instant('sales.online.confirmCreate.body', { collect: this._money.transform(this.collect()), terms: this._translate.instant('sales.online.terms.' + this.paymentType()) }),
            ok: this._translate.instant('sales.online.create'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this.creating.set(true);
            const choice = this.addressChoice()!;
            const address = choice === 'new' ? this.newPayload() : { oid: choice };
            const terms = this.paymentType();
            this._orders
                .create({
                    oid: this.orderOid(),
                    // The name goes whenever there is one: after a failed lookup the page cannot tell a new customer from a known one, and the server keeps a known customer's own.
                    customer: { phone: this.normalizedPhone()!, name: this.customerName().trim() || null, gender: this.gender(), age_band: this.ageBand() },
                    address,
                    source_oid: this.sourceOid()!,
                    payment_type: terms,
                    payment_method: terms === 'COD' ? undefined : this.method(),
                    payment_reference: terms === 'COD' ? null : this.reference().trim() || null,
                    amount_paid: terms === 'ADVANCE' ? (this.advance() ?? 0) : undefined,
                    delivery_charge: this.deliveryCharge(),
                    total_amount: this.total(),
                    blocked_acknowledged: this.blockedAcknowledged(),
                    notes: this.notes().trim() || null,
                    lines: this.lines().map(({ inventory_oid, quantity, discount }) => ({ inventory_oid, quantity, discount })),
                })
                .subscribe({
                    next: ({ invoice_no, customer_oid, amount_paid, tracking_token }) => {
                        this.lastInvoice.set(this.invoiceOf(invoice_no, amount_paid, tracking_token));
                        this.creating.set(false);
                        this.unanswered.set(false);
                        this._products.forget();
                        const placed = { invoice_no, total: this.total(), collect: this.collect(), customer_oid };
                        this.newOrder();
                        this.done.set(placed);
                    },
                    error: (error: unknown) => {
                        this.creating.set(false);
                        this.failCreate(error);
                    },
                });
        });
    }

    /** Says what is missing and lights the part of the page that needs it, scrolled into view. */
    private pointAt(blocker: string): void {
        const reason = blocker.split('.').pop()!;
        this.tried.set(true);
        if (!FIELD_BLOCKERS.includes(reason)) this._message.warning(this._translate.instant(blocker));
        const part = BLOCKER_PART[reason] ?? null;
        this.attention.set(part);
        if (part) document.querySelector(`[data-online="${part}"]`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
        clearTimeout(this._attentionTimer);
        this._attentionTimer = setTimeout(() => this.attention.set(null), 2500);
    }

    newOrder(): void {
        this.done.set(null);
        this.tried.set(false);
        this._resumeAddress = null;
        this.unanswered.set(false);
        this.orderOid.set(crypto.randomUUID());
        this.phone.set('');
        this.customerName.set('');
        this.gender.set(null);
        this.ageBand.set(null);
        this.pasteText.set('');
        this.pasted.set(null);
        this.addressChoice.set(null);
        this.newAddress.set(null);
        this.lines.set([]);
        this.chargeTyped.set(null);
        this.paymentType.set('COD');
        this.method.set('bkash');
        this.advance.set(null);
        this.reference.set('');
        this.notes.set('');
        this.blockedAcknowledged.set(false);
        const sources = this.setup()?.sources ?? [];
        this.sourceOid.set(sources.length === 1 ? sources[0].oid : null);
    }

    /** Clear asks first, since what was typed is gone once it is cleared. */
    clearOrder(): void {
        if (!this.dirty()) return this.newOrder();
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.online.confirmClear.title'),
            body: this._translate.instant('sales.online.confirmClear.body'),
            ok: this._translate.instant('sales.online.clear'),
            cancel: this._translate.instant('form.confirm.cancel'),
            danger: true,
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (confirmed) this.newOrder();
        });
    }

    /** A half-made order goes to the server as a draft: no stock held, no customer saved (REQ-42). */
    saveDraft(): void {
        if (!this.lines().length) return this.pointAt('sales.online.blocker.empty');
        if (this.savingDraft() || this.busy()) return;
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.online.drafts.saveTitle'),
            body: this._translate.instant('sales.online.drafts.saveBody'),
            ok: this._translate.instant('sales.online.drafts.save'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (confirmed) this.sendDraft();
        });
    }

    private sendDraft(): void {
        this.savingDraft.set(true);
        const choice = this.addressChoice();
        this._orders
            .saveDraft({
                oid: this.orderOid(),
                draft_label: this.customer()?.name ?? (this.customerName().trim() || null),
                customer: { phone: this.normalizedPhone(), name: this.customerName().trim() || this.customer()?.name || null },
                address: choice === 'new' && this.newAddress() ? this.newPayload() : choice ? { oid: choice } : undefined,
                source_oid: this.sourceOid(),
                payment_type: this.paymentType(),
                delivery_charge: this.deliveryCharge(),
                notes: this.notes().trim() || null,
                lines: this.lines().map(({ inventory_oid, quantity, discount }) => ({ inventory_oid, quantity, discount })),
            })
            .subscribe({
                next: ({ invoice_no }) => {
                    this.savingDraft.set(false);
                    this._message.success(this._translate.instant('sales.online.drafts.saved', { number: invoice_no }));
                    this.newOrder();
                },
                error: (error: unknown) => {
                    this.savingDraft.set(false);
                    this._message.error(error instanceof HttpErrorResponse && error.status === 409 ? error.error?.message : this._translate.instant('sales.online.drafts.failed.' + failureOf(error)));
                },
            });
    }

    openDrafts(): void {
        this.draftsOpen.set(true);
        this.draftsLoading.set(true);
        this._orders.drafts().subscribe({
            next: (drafts) => {
                this.drafts.set(drafts);
                this.draftsLoading.set(false);
            },
            error: (error: unknown) => {
                this.draftsLoading.set(false);
                this._message.error(this._translate.instant('sales.online.drafts.loadFailed.' + failureOf(error)));
            },
        });
    }

    /** A draft replaces an empty screen only, so nothing on screen is ever lost by resuming. */
    resume(draft: OnlineDraft): void {
        if (this.dirty() && this.orderOid() !== draft.oid) {
            this._message.warning(this._translate.instant('sales.online.drafts.screenNotEmpty'));
            return;
        }
        this.newOrder();
        this.orderOid.set(draft.oid);
        this.phone.set(draft.customer_phone ?? '');
        this.customerName.set(draft.customer_name ?? '');
        this.lines.set(draft.lines.map((line) => ({ ...line, discount: Math.min(line.discount, this.discountCap(line)) })));
        this.sourceOid.set(draft.source_oid);
        this.notes.set(draft.notes ?? '');
        this.paymentType.set(draft.payment_type ?? 'COD');
        this.chargeTyped.set(draft.delivery_charge);
        if (draft.customer_address_oid) this._resumeAddress = draft.customer_address_oid;
        else if (draft.district_oid && draft.thana_oid && draft.address_line && draft.recipient_name) {
            this.newAddress.set({ label: null, recipient_name: draft.recipient_name, recipient_phone: draft.recipient_phone, address_line: draft.address_line, district_oid: draft.district_oid, thana_oid: draft.thana_oid, area_text: draft.area_text, postal_code: draft.postal_code, is_default: false, district_name_en: draft.district_name_en ?? '', district_name_bn: draft.district_name_bn ?? '', thana_name_en: draft.thana_name_en ?? '', thana_name_bn: draft.thana_name_bn ?? '' });
            this.addressChoice.set('new');
        }
        this.draftsOpen.set(false);
        if (draft.lines.some((line) => line.quantity > line.sellable)) this._message.warning(this._translate.instant('sales.online.drafts.short'));
    }

    discardDraft(draft: OnlineDraft): void {
        this._asking.set(true);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.online.drafts.discardTitle', { name: draft.draft_label || draft.invoice_no }),
            body: this._translate.instant('sales.online.drafts.discardBody'),
            ok: this._translate.instant('sales.online.drafts.discard'),
            cancel: this._translate.instant('form.confirm.cancel'),
            danger: true,
        }).subscribe((confirmed) => {
            this._asking.set(false);
            if (!confirmed) return;
            this._orders.discardDraft(draft.oid).subscribe({
                next: () => {
                    this.drafts.update((drafts) => drafts.filter((item) => item.oid !== draft.oid));
                    if (this.orderOid() === draft.oid) this.newOrder();
                },
                error: (error: unknown) => this._message.error(error instanceof HttpErrorResponse && error.status === 409 ? error.error?.message : this._translate.instant('sales.online.drafts.failed.' + failureOf(error))),
            });
        });
    }

    private snapshot(): Unsent {
        return { orderOid: this.orderOid(), phone: this.phone(), customerName: this.customerName(), gender: this.gender(), ageBand: this.ageBand(), addressChoice: this.addressChoice(), newAddress: this.newAddress(), lines: this.lines(), sourceOid: this.sourceOid(), chargeTyped: this.chargeTyped(), paymentType: this.paymentType(), method: this.method(), advance: this.advance(), reference: this.reference(), notes: this.notes() };
    }

    private restore(): void {
        const unsent = recalled<Unsent>(UNSENT_KEY);
        if (!unsent?.lines) return;
        this.orderOid.set(unsent.orderOid);
        this.phone.set(unsent.phone);
        this.customerName.set(unsent.customerName);
        this.gender.set(unsent.gender);
        this.ageBand.set(unsent.ageBand);
        this.newAddress.set(unsent.newAddress);
        this.addressChoice.set(unsent.addressChoice);
        if (unsent.addressChoice && unsent.addressChoice !== 'new') this._resumeAddress = unsent.addressChoice;
        this.lines.set(unsent.lines);
        this.sourceOid.set(unsent.sourceOid);
        this.chargeTyped.set(unsent.chargeTyped);
        this.paymentType.set(unsent.paymentType);
        this.method.set(unsent.method);
        this.advance.set(unsent.advance);
        this.reference.set(unsent.reference);
        this.notes.set(unsent.notes);
    }

    private newPayload(): AddressPayload {
        const address = this.newAddress()!;
        return { label: address.label, recipient_name: address.recipient_name, recipient_phone: address.recipient_phone, address_line: address.address_line, district_oid: address.district_oid, thana_oid: address.thana_oid, area_text: address.area_text, postal_code: address.postal_code, is_default: false };
    }

    /**
     * The server's 409s each say what to do: a line that ran out names how many are left; an order
     * already placed (a repeated press) is finished; a price that changed refreshes the lines for the
     * moderator to check; a blocked customer asks for the tick.
     */
    private failCreate(error: unknown): void {
        if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400)) {
            const data = error.error?.data ?? {};
            if (typeof data.sellable === 'number' && data.inventory_oid) {
                const at = this.lines().findIndex((line) => line.inventory_oid === data.inventory_oid);
                if (at >= 0) this.patch(at, { sellable: data.sellable });
                this.say('error', 'sales.online.onlyLeft', { count: this._digits.transform(data.sellable), name: this.lines()[at]?.product_name ?? '' });
                return;
            }
            if (data.invoice_no && data.status) {
                this.lastInvoice.set(this.invoiceOf(data.invoice_no, this.paid(), null));
                const placed = { invoice_no: data.invoice_no, total: this.total(), collect: this.collect(), customer_oid: this.customer()?.oid ?? '' };
                this.newOrder();
                this.done.set(placed);
                this.say('success', 'sales.online.alreadyPlaced', { number: data.invoice_no });
                return;
            }
            if (typeof data.total_amount === 'number' && Array.isArray(data.lines)) {
                const prices = new Map<string, number>(data.lines.map((line: { inventory_oid: string; unit_price: number }) => [line.inventory_oid, line.unit_price]));
                this.lines.update((lines) => lines.map((line) => ({ ...line, selling_price: prices.get(line.inventory_oid) ?? line.selling_price })));
                this.say('warning', 'sales.online.priceChanged');
                return;
            }
            this._message.error(error.error?.message ?? this._translate.instant('sales.online.failed.server'));
            return;
        }
        const kind = failureOf(error);
        if (kind === 'network') this.unanswered.set(true);
        this._message.error(this._translate.instant('sales.online.failed.' + kind));
    }

    private patch(index: number, change: Partial<CartLine>): void {
        this.lines.update((lines) => lines.map((line, i) => (i === index ? { ...line, ...change } : line)));
    }

    printLast(): void {
        const invoice = this.lastInvoice();
        if (invoice) printInvoice(invoice);
    }

    /** The invoice of the order just placed, from what the server accepted: it priced the same lines to the same total. Built at the sale, so a reprint keeps its date. */
    private invoiceOf(invoice_no: string, paid: number, tracking_token: string | null): InvoiceContent {
        const t = (key: string, params?: Record<string, unknown>) => this._translate.instant('sales.online.invoice.' + key, params);
        const money = (value: number) => this._money.transform(value);
        const business = this._session.business();
        const phone = this.normalizedPhone() ?? '';
        const address = this.chosenAddress()!;
        const bn = this.language() === 'bn';
        const place = [address.address_line, bn ? address.thana_name_bn : address.thana_name_en, bn ? address.district_name_bn : address.district_name_en, address.postal_code].filter(Boolean).join(', ');
        const terms = this._translate.instant('sales.online.terms.' + this.paymentType());
        const method = this.paymentType() === 'COD' ? '' : ', ' + this._translate.instant('sales.pos.method.' + this.method());
        const rows = (...pairs: ([string, string] | null)[]) => pairs.filter((pair): pair is [string, string] => !!pair);
        return {
            business: business?.name ?? '',
            logoUrl: this.setup()?.logo_url ?? null,
            track: tracking_token ? { url: `${environment.trackerUrl}/${tracking_token}`, label: t('track') } : null,
            contact: [business?.address, business?.phone].filter((line): line is string => !!line),
            title: t('title'),
            meta: [
                [t('number'), invoice_no],
                [t('date'), new RecordDatePipe().transform(new Date(), this.language(), 'date-time-12')],
            ],
            billedTo: { label: t('billedTo'), lines: [this.customer()?.name ?? this.customerName().trim(), phone] },
            shipTo: { label: t('shipTo'), lines: [address.recipient_name, address.recipient_phone ?? phone, place] },
            columns: { item: t('item'), quantity: t('quantity'), price: t('price'), amount: t('amount') },
            lines: this.lines().map((line) => ({ name: line.product_name, quantity: this._digits.transform(line.quantity), price: money(line.selling_price), amount: money(line.selling_price * line.quantity) })),
            totals: rows([t('subtotal'), money(this.subtotal())], this.discountTotal() ? [t('discount'), '-' + money(this.discountTotal())] : null, [t('delivery'), money(this.deliveryCharge())], [t('total'), money(this.total())], paid ? [t('paid'), '-' + money(paid)] : null, [t('collect'), t('withCurrency', { amount: money(Math.max(0, this.total() - paid)) })]),
            notes: rows([t('payment'), terms + method], this.notes().trim() ? [t('note'), this.notes().trim()] : null),
            thanks: t('thanks'),
            poweredBy: t('poweredBy'),
        };
    }

    private say(kind: 'success' | 'warning' | 'error', key: string, params?: Record<string, unknown>): void {
        this._message[kind](this._translate.instant(key, params));
    }
}

const sameLine = (a: string, b: string) => a.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') === b.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const UNSENT_KEY = Constants.ONLINE_UNSENT_KEY;

/** The order on screen, kept in this browser until it is placed, saved as a draft or cleared. */
interface Unsent {
    orderOid: string;
    phone: string;
    customerName: string;
    gender: CustomerGender | null;
    ageBand: CustomerAgeBand | null;
    addressChoice: string | null;
    newAddress: NewAddress | null;
    lines: CartLine[];
    sourceOid: string | null;
    chargeTyped: number | null;
    paymentType: PaymentTerms;
    method: PaymentMethod;
    advance: number | null;
    reference: string;
    notes: string;
}

/** Browser storage can be blocked or full; the page works the same without it. */
function remember(key: string, value: unknown): void {
    try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
    } catch {
        return;
    }
}

function recalled<T>(key: string): T | null {
    try {
        return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
    } catch {
        return null;
    }
}

/** The customer behind the phone, looked up as soon as it is a mobile number. */
function lookupOf(orders: OnlineOrderService, phone: () => string | null) {
    const state = signal<Lookup>({ state: 'idle' });
    toObservable(computed(phone))
        .pipe(
            distinctUntilChanged(),
            switchMap((value) => {
                if (!value) return of<Lookup>({ state: 'idle' });
                state.set({ state: 'loading' });
                return orders.findCustomer(value).pipe(
                    map((result): Lookup => ({ state: 'done', result })),
                    catchError((error: unknown) => of<Lookup>({ state: 'failed', kind: failureOf(error) }))
                );
            }),
            takeUntilDestroyed()
        )
        .subscribe((value) => state.set(value));
    return state.asReadonly();
}
