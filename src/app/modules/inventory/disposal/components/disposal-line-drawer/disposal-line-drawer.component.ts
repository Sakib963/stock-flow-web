import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { DISPOSAL_REASONS, DisposableProduct, DisposalLineDraft, DisposalReason } from '@app/core/models/disposal.model';
import { DisposalService } from '@app/modules/inventory/disposal/services/disposal.service';
import { batchesFor, lineProblem } from '@app/modules/inventory/disposal/utils/disposal-line/disposal-line';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { LanguageService } from '@app/core/services/language/language.service';

/**
 * One disposal line, added or changed in a drawer: the product, a batch with something free, how
 * many, and why. The batch's cost, price and expiry are shown read only: a disposal moves quantity only.
 */
@Component({
    selector: 'disposal-line-drawer',
    imports: [DigitsPipe, MoneyPipe, RecordDatePipe, FormsModule, NgIcon, ReactiveFormsModule, NzButtonModule, NzDrawerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzSelectModule, NzSpinModule, TranslatePipe],
    providers: [provideIcons({ lucideCheck, lucideX })],
    templateUrl: './disposal-line-drawer.component.html',
    styleUrl: './disposal-line-drawer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisposalLineDrawerComponent {
    private readonly _disposals = inject(DisposalService);
    private readonly _destroy = inject(DestroyRef);
    readonly language = inject(LanguageService).current;

    readonly open = input(false);
    /** The line being changed, or null to add one. */
    readonly line = input<DisposalLineDraft | null>(null);

    /** The picker sizes its list by row height; product and batch rows are two lines. */
    readonly optionHeight = 42;
    readonly reasons = DISPOSAL_REASONS;

    readonly saved = output<DisposalLineDraft>();
    readonly closed = output<void>();

    readonly form = inject(FormBuilder).nonNullable.group({
        inventory_oid: [''],
        quantity: [null as number | null],
        reason: [null as DisposalReason | null],
        line_note: ['', [Validators.maxLength(500)]],
    });
    readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly product = signal<DisposableProduct | null>(null);
    readonly results = signal<DisposableProduct[]>([]);
    /** A search the person typed; it shows the picker's spinner. */
    readonly searching = signal(false);
    /** The list loaded in the background as the drawer or picker opens; it never spins the picker. */
    readonly preloading = signal(false);
    private _lastTerm: string | null = null;
    private readonly _search = new Subject<string>();
    readonly tried = signal(false);

    readonly batches = computed(() => batchesFor(this.product()));
    readonly batch = computed(() => this.product()?.batches.find((b) => b.oid === this.value().inventory_oid) ?? null);
    readonly options = computed(() => {
        const own = this.product();
        const found = this.results();
        return own && !found.some((p) => p.oid === own.oid) ? [own, ...found] : found;
    });
    readonly problem = computed(() => {
        this.value();
        return this.tried() ? lineProblem(this.draft()) : null;
    });

    constructor() {
        this._search
            .pipe(
                debounceTime(250),
                switchMap((term) => this._disposals.searchProducts(term).pipe(catchError(() => of([] as DisposableProduct[])))),
                takeUntilDestroyed(this._destroy)
            )
            .subscribe((found) => {
                this.results.set(found);
                this.searching.set(false);
                this.preloading.set(false);
            });

        effect(() => {
            if (!this.open()) return;
            untracked(() => this.reset());
        });
    }

    search(term: string, quiet = false): void {
        this._lastTerm = term;
        (quiet ? this.preloading : this.searching).set(true);
        this._search.next(term);
    }

    /** Opening the picker shows the whole list again, unless it already does. */
    opened(open: boolean): void {
        if (open && (this._lastTerm !== '' || !this.results().length)) this.search('', true);
    }

    pickProduct(oid: string): void {
        this.product.set(this.options().find((p) => p.oid === oid) ?? null);
        this.form.controls.inventory_oid.setValue('');
    }

    save(): void {
        this.tried.set(true);
        if (lineProblem(this.draft()) !== null) return;
        this.saved.emit(this.draft());
    }

    draft(): DisposalLineDraft {
        const raw = this.form.getRawValue();
        const product = this.product();
        return {
            product: product!,
            batch: this.batch(),
            product_oid: product?.oid ?? '',
            inventory_oid: raw.inventory_oid || null,
            quantity: raw.quantity === null ? null : Number(raw.quantity),
            reason: raw.reason,
            line_note: raw.line_note.trim() || null,
        };
    }

    private reset(): void {
        const line = this.line();
        this.tried.set(false);
        this.results.set([]);
        this.product.set(line?.product ?? null);
        this.form.reset({ inventory_oid: line?.inventory_oid ?? '', quantity: line?.quantity ?? null, reason: line?.reason ?? null, line_note: line?.line_note ?? '' });
        this.search('', true);
        if (line) this.refreshBatches(line.product);
    }

    /** A line opened for editing carries only its own batch; this brings the product's others without touching the picker. */
    private refreshBatches(product: DisposableProduct): void {
        this._disposals
            .searchProducts(product.sku || product.name)
            .pipe(
                catchError(() => of([] as DisposableProduct[])),
                takeUntilDestroyed(this._destroy)
            )
            .subscribe((found) => {
                const fresh = found.find((p) => p.oid === product.oid);
                if (fresh && this.product()?.oid === fresh.oid) this.product.set(fresh);
            });
    }
}
