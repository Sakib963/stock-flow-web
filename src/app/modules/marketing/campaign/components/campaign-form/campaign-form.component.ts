import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHandshake, lucidePackage, lucidePencil, lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { CampaignBatch, CampaignDetails, CampaignPartner, CampaignPayload, PROMOTION_TYPES, PartnerChoice, PromotionType, budgetPerUnit } from '@app/core/models/campaign.model';
import { BatchDrawerComponent } from '@app/modules/marketing/campaign/components/batch-drawer/batch-drawer.component';
import { PartnerDrawerComponent } from '@app/modules/marketing/campaign/components/partner-drawer/partner-drawer.component';
import { CampaignService } from '@app/modules/marketing/campaign/services/campaign.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { fromDay, toDay } from '@app/shared/utils/calendar-day/calendar-day';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

const number = (value: unknown): number | null => (value === null || value === undefined || value === '' ? null : Number(value));

/**
 * The campaign form, rendered by the create page and the edit page. The promoted batches and the
 * partners are read only tables, each added or changed in a drawer, as stock adjustment lines are.
 */
@Component({
    selector: 'campaign-form',
    imports: [BatchDrawerComponent, PartnerDrawerComponent, DigitsPipe, MoneyPipe, NgIcon, ReactiveFormsModule, NzButtonModule, NzDatePickerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzSelectModule, NzTableModule, NzTooltipModule, TranslatePipe],
    providers: [provideIcons({ lucideHandshake, lucidePackage, lucidePencil, lucidePlus, lucideTrash2 })],
    templateUrl: './campaign-form.component.html',
    styleUrl: './campaign-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignFormComponent {
    private readonly _campaigns = inject(CampaignService);

    readonly formId = 'campaign-form';
    readonly types = PROMOTION_TYPES;

    readonly editing = input<CampaignDetails | null>(null);
    readonly submitted = output<void>();

    readonly form = inject(FormBuilder).nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(255)]],
        promotion_type: ['' as PromotionType | '', [Validators.required]],
        posting: [[] as Date[], [Validators.required]],
        measure_end: [null as Date | null],
        ad_spend: [null as number | null, [Validators.min(0)]],
        other_cost: [null as number | null, [Validators.min(0)]],
        other_cost_note: ['', [Validators.maxLength(500)]],
        note: ['', [Validators.maxLength(1000)]],
    });
    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly batches = signal<CampaignBatch[]>([]);
    readonly partners = signal<CampaignPartner[]>([]);
    readonly partnerChoices = signal<PartnerChoice[]>([]);
    readonly partnersLoading = signal(true);
    readonly partnersFailed = signal(false);

    readonly batchDrawer = signal(false);
    readonly partnerDrawer = signal(false);
    readonly partnerRow = signal<number | null>(null);
    readonly partnerLine = computed(() => (this.partnerRow() === null ? null : (this.partners()[this.partnerRow()!] ?? null)));
    readonly takenBatches = computed(() => new Set(this.batches().map((b) => b.inventory_oid)));
    readonly takenPartners = computed(() => new Set(this.partners().map((p) => p.partner_oid)));

    readonly batchRows = computed(() => this.batches().map((b) => ({ ...b, perUnit: budgetPerUnit(b), total: budgetPerUnit(b) * b.units })));
    readonly fees = computed(() => this.partners().reduce((sum, p) => sum + Number(p.agreed_fee), 0));

    readonly remaining = computed(() => {
        const value = this._value();
        return [value.name?.trim(), value.promotion_type, value.posting?.length === 2].filter((field) => !field).length + (this.batches().length ? 0 : 1);
    });

    constructor() {
        this.loadPartners();
        effect(() => {
            const record = this.editing();
            if (record) this.fill(record);
        });
    }

    loadPartners(): void {
        this.partnersFailed.set(false);
        this.partnersLoading.set(true);
        this._campaigns
            .partners()
            .pipe(finalize(() => this.partnersLoading.set(false)))
            .subscribe({ next: (rows) => this.partnerChoices.set(rows), error: () => this.partnersFailed.set(true) });
    }

    /** No day before the posting window ends can close the measuring window. */
    readonly beforePostingEnd = (day: Date): boolean => {
        const end = this._value().posting?.[1];
        return !!end && toDay(day)! < toDay(end)!;
    };

    addBatch(batch: CampaignBatch): void {
        this.batches.update((rows) => [...rows, batch]);
        this.form.markAsDirty();
        this.batchDrawer.set(false);
    }

    removeBatch(row: number): void {
        this.batches.update((rows) => rows.filter((_, i) => i !== row));
        this.form.markAsDirty();
    }

    openPartner(row: number | null): void {
        this.partnerRow.set(row);
        this.partnerDrawer.set(true);
    }

    closePartner(): void {
        this.partnerDrawer.set(false);
        this.partnerRow.set(null);
    }

    savePartner(line: CampaignPartner): void {
        const row = this.partnerRow();
        this.partners.update((rows) => (row === null ? [...rows, line] : rows.map((old, i) => (i === row ? line : old))));
        this.form.markAsDirty();
        this.closePartner();
    }

    removePartner(row: number): void {
        this.partners.update((rows) => rows.filter((_, i) => i !== row));
        this.form.markAsDirty();
    }

    valid(): boolean {
        revealErrors(this.form);
        return this.form.valid && this.form.controls.posting.value.length === 2 && this.batches().length > 0;
    }

    payload(oid: string): CampaignPayload {
        const raw = this.form.getRawValue();
        return {
            oid,
            name: raw.name.trim(),
            promotion_type: raw.promotion_type as PromotionType,
            posting_start: toDay(raw.posting[0])!,
            posting_end: toDay(raw.posting[1])!,
            measure_end: toDay(raw.measure_end),
            ad_spend: number(raw.ad_spend),
            other_cost: number(raw.other_cost),
            other_cost_note: raw.other_cost_note.trim() || null,
            note: raw.note.trim() || null,
            batches: this.batches().map((b) => b.inventory_oid),
            partners: this.partners().map((p) => ({ partner_oid: p.partner_oid, agreed_fee: Number(p.agreed_fee), note: p.note })),
        };
    }

    invalid(field: 'name' | 'promotion_type' | 'posting'): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    private fill({ details, batches, partners }: CampaignDetails): void {
        this.form.setValue({
            name: details.name,
            promotion_type: details.promotion_type,
            posting: [fromDay(details.posting_start)!, fromDay(details.posting_end)!],
            measure_end: fromDay(details.measure_end),
            ad_spend: number(details.ad_spend),
            other_cost: number(details.other_cost),
            other_cost_note: details.other_cost_note ?? '',
            note: details.note ?? '',
        });
        this.batches.set(batches);
        this.partners.set(partners.map((p) => ({ ...p, agreed_fee: Number(p.agreed_fee) })));
        // Loading a record is not someone typing, so leaving straight after must not ask.
        this.form.markAsPristine();
    }
}
