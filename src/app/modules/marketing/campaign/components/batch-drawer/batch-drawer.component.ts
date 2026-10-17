import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { CampaignBatch, PromotableProduct, budgetPerUnit } from '@app/core/models/campaign.model';
import { CampaignService } from '@app/modules/marketing/campaign/services/campaign.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { categoryGroups } from '@app/shared/utils/category-groups/category-groups';

/** Adds one promoted batch: the product first, then which of its batches on the shelf, with that batch's budget. */
@Component({
    selector: 'campaign-batch-drawer',
    imports: [DigitsPipe, MoneyPipe, FormsModule, NgIcon, NzButtonModule, NzDrawerModule, NzFormModule, NzSelectModule, NzSpinModule, TranslatePipe],
    providers: [provideIcons({ lucideCheck, lucideX })],
    templateUrl: './batch-drawer.component.html',
    styleUrl: './batch-drawer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchDrawerComponent {
    private readonly _campaigns = inject(CampaignService);

    readonly open = input(false);
    /** Batches already on the campaign, so one is not added twice. */
    readonly taken = input<ReadonlySet<string>>(new Set());

    readonly saved = output<CampaignBatch>();
    readonly closed = output<void>();

    readonly optionHeight = 42;
    readonly results = signal<PromotableProduct[]>([]);
    readonly searching = signal(false);
    readonly productOid = signal<string | null>(null);
    readonly batchOid = signal<string | null>(null);
    readonly tried = signal(false);
    private readonly _search = new Subject<string>();

    readonly optionGroups = computed(() => categoryGroups(this.results()));
    readonly product = computed(() => this.results().find((p) => p.oid === this.productOid()) ?? null);
    readonly batches = computed(() => (this.product()?.batches ?? []).map((b) => ({ ...b, perUnit: budgetPerUnit(b), taken: this.taken().has(b.oid) })));
    readonly batch = computed(() => this.batches().find((b) => b.oid === this.batchOid()) ?? null);

    constructor() {
        this._search
            .pipe(
                debounceTime(250),
                switchMap((term) => this._campaigns.searchBatches(term).pipe(catchError(() => of([] as PromotableProduct[])))),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe((found) => {
                this.results.set(found);
                this.searching.set(false);
            });

        effect(() => {
            if (!this.open()) return;
            untracked(() => {
                this.productOid.set(null);
                this.batchOid.set(null);
                this.tried.set(false);
                this.search('');
            });
        });
    }

    search(term: string): void {
        this.searching.set(true);
        this._search.next(term);
    }

    pickProduct(oid: string | null): void {
        this.productOid.set(oid);
        // The newest batch not already on the campaign is the usual choice.
        this.batchOid.set(this.batches().find((b) => !b.taken)?.oid ?? null);
    }

    save(): void {
        this.tried.set(true);
        const product = this.product();
        const batch = this.batch();
        if (!product || !batch || batch.taken) return;
        this.saved.emit({
            inventory_oid: batch.oid,
            batch_code: batch.batch_code,
            product_oid: product.oid,
            product_name: product.name,
            sku: product.sku,
            units: batch.units,
            on_hand: batch.on_hand,
            influencer_cost: batch.influencer_cost,
            ad_run_cost: batch.ad_run_cost,
            gift_cost: batch.gift_cost,
            content_creation_cost: batch.content_creation_cost,
        });
    }
}
