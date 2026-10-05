import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarClock, lucideCalendarX, lucideCircleAlert, lucidePackage, lucideRotateCw, lucideScanBarcode, lucideSearchX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectComponent, NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, map, merge, of, switchMap } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { PosBatch } from '@app/core/models/pos.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { PosService } from '@app/modules/sales/pos/services/pos.service';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { expiryState } from '@app/shared/utils/calendar-day/calendar-day';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/**
 * One box for name, SKU or batch code (sales REQ-13), searched on the server as you type, its batches
 * in an `nz-select` dropdown so the cart never moves. A scanner types the code and presses Enter: an
 * exact batch code, or a SKU with one batch, goes straight to the cart (REQ-14); a SKU with several
 * batches stays listed so the person picks the batch (REQ-16).
 */
@Component({
    selector: 'product-search',
    imports: [FormsModule, NgIcon, NzButtonModule, NzSelectModule, NzSpinModule, TranslatePipe, StatusTagComponent, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideCalendarClock, lucideCalendarX, lucideCircleAlert, lucidePackage, lucideRotateCw, lucideScanBarcode, lucideSearchX })],
    templateUrl: './product-search.component.html',
    styleUrl: './product-search.component.scss',
    host: { class: 'block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSearchComponent {
    private readonly _pos = inject(PosService);
    private readonly _typed = new Subject<string>();
    private readonly _now = new Subject<string>();
    private _enterPending = false;
    /** Enter takes the highlighted option only once someone moved to it with the arrows; otherwise it is a scan. */
    private _arrowed = false;

    readonly language = inject(LanguageService).current;
    readonly picked = output<PosBatch>();
    readonly select = viewChild.required(NzSelectComponent);
    private readonly _host = viewChild.required(NzSelectComponent, { read: ElementRef });

    /** The list scrolls by a fixed row height; a finger at the counter gets 44px rows (REQ-12). */
    readonly optionHeight = (window.matchMedia?.('(pointer: coarse)').matches ?? false) ? 44 : 32;
    readonly open = signal(false);
    readonly text = signal('');
    readonly results = signal<PosBatch[]>([]);
    readonly loading = signal(false);
    readonly failed = signal<RequestFailure | null>(null);
    readonly searched = signal('');

    readonly groups = computed(() => {
        const groups = new Map<string, { oid: string; label: string; batches: PosBatch[] }>();
        for (const batch of this.results()) {
            const group = groups.get(batch.product_oid) ?? { oid: batch.product_oid, label: batch.sku ? `${batch.product_name} · ${batch.sku}` : batch.product_name, batches: [] };
            group.batches.push(batch);
            groups.set(batch.product_oid, group);
        }
        return [...groups.values()];
    });

    constructor() {
        const destroyRef = inject(DestroyRef);
        merge(this._typed.pipe(debounceTime(250)), this._now)
            .pipe(
                switchMap((text) =>
                    this._pos.search(text).pipe(
                        map((rows) => ({ text, rows, failed: null as RequestFailure | null })),
                        catchError((error: unknown) => of({ text, rows: [] as PosBatch[], failed: failureOf(error) as RequestFailure | null }))
                    )
                ),
                takeUntilDestroyed(destroyRef)
            )
            .subscribe(({ text, rows, failed }) => {
                if (text !== this.text().trim()) return;
                this.results.set(rows);
                this.failed.set(failed);
                this.searched.set(text);
                this.loading.set(false);
                if (this._enterPending) {
                    this._enterPending = false;
                    this.takeExactMatch();
                }
            });

        // Capture, on the select's host, runs before nz-select's own Enter, which would take whatever option is highlighted.
        afterNextRender(() => {
            const host: HTMLElement = this._host().nativeElement;
            const keydown = (event: KeyboardEvent) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') this._arrowed = true;
                else if (event.key === 'Enter') {
                    if (this._arrowed && this.open()) return;
                    event.stopPropagation();
                    this.enter(event);
                }
            };
            host.addEventListener('keydown', keydown, true);
            destroyRef.onDestroy(() => host.removeEventListener('keydown', keydown, true));
        });
    }

    focus(): void {
        this.select().focus();
    }

    typed(value: string): void {
        this._arrowed = false;
        this.text.set(value);
        const text = value.trim();
        if (!text) {
            this.clear();
            return;
        }
        // Set on the keystroke, not after the debounce, so the list never claims nothing matches while it is still asking.
        this.loading.set(true);
        this._typed.next(text);
    }

    opened(open: boolean): void {
        this.open.set(open);
        // nz-select empties its box when it opens or closes, so the search it showed goes with it.
        if (!open) this.clear();
    }

    chosen(oid: string | null): void {
        const batch = this.results().find((row) => row.inventory_oid === oid);
        if (batch) this.pick(batch);
    }

    enter(event: Event): void {
        event.preventDefault();
        const text = this.text().trim();
        if (!text) return;
        if (!this.loading() && this.searched() === text) {
            this.takeExactMatch();
            return;
        }
        this._enterPending = true;
        this.loading.set(true);
        this._now.next(text);
    }

    retry(): void {
        const text = this.text().trim();
        if (!text) return;
        this.loading.set(true);
        this._now.next(text);
    }

    pick(batch: PosBatch): void {
        this.picked.emit(batch);
        this.select().writeValue(null);
        this.select().setOpenState(false);
        this.clear();
        this.focus();
    }

    clear(): void {
        this._enterPending = false;
        this._arrowed = false;
        this.text.set('');
        this.results.set([]);
        this.searched.set('');
        this.loading.set(false);
        this.failed.set(null);
    }

    expiry(batch: PosBatch): string {
        return expiryState(batch.expiry_date);
    }

    private takeExactMatch(): void {
        const code = this.text().trim().toLowerCase();
        const rows = this.results();
        const batch = rows.find((row) => row.batch_code.toLowerCase() === code);
        if (batch) return this.pick(batch);
        const bySku = rows.filter((row) => row.sku?.toLowerCase() === code);
        if (bySku.length === 1) return this.pick(bySku[0]);
        if (!bySku.length && rows.length === 1) return this.pick(rows[0]);
    }
}
