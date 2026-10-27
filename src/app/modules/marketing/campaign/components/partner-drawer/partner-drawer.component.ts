import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideRotateCw, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { TranslatePipe } from '@ngx-translate/core';
import { CampaignPartner, PartnerChoice } from '@app/core/models/campaign.model';
import { CampaignService } from '@app/modules/marketing/campaign/services/campaign.service';
import { ServerSearch } from '@app/shared/utils/server-search/server-search';

/** Adds or changes one partner on the campaign: who, and the fee agreed with them. */
@Component({
    selector: 'campaign-partner-drawer',
    imports: [FormsModule, NgIcon, NzButtonModule, NzDrawerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzSelectModule, TranslatePipe],
    providers: [provideIcons({ lucideCheck, lucideRotateCw, lucideX })],
    templateUrl: './partner-drawer.component.html',
    styleUrl: './partner-drawer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerDrawerComponent {
    readonly open = input(false);
    /** The partner line being changed, or null to add one. */
    readonly line = input<CampaignPartner | null>(null);
    /** Partners already on the campaign, which the search leaves out. */
    readonly taken = input<ReadonlySet<string>>(new Set());

    readonly saved = output<CampaignPartner>();
    readonly closed = output<void>();

    readonly partnerOid = signal<string | null>(null);
    readonly fee = signal<number | null>(null);
    readonly note = signal('');
    readonly tried = signal(false);

    private readonly _campaigns = inject(CampaignService);
    /** Searched on the server by name or handle: partners grow with every campaign. Only adding a line picks one. */
    readonly picker = new ServerSearch<PartnerChoice>((term, offset) => this._campaigns.partners(term, offset, [...this.taken()]), inject(DestroyRef));
    /** The partner picked, kept here: the picker leaves it out of its list while a search is typed. */
    private readonly _picked = signal<PartnerChoice | null>(null);
    readonly incomplete = computed(() => this.tried() && (!this.partnerOid() || this.fee() === null || this.fee()! < 0));

    constructor() {
        effect(() => {
            if (!this.open()) return;
            untracked(() => {
                const line = this.line();
                this.partnerOid.set(line?.partner_oid ?? null);
                this.fee.set(line ? Number(line.agreed_fee) : null);
                this.note.set(line?.note ?? '');
                this.tried.set(false);
                this._picked.set(null);
                if (!line) this.picker.start();
            });
        });
    }

    pick(oid: string | null): void {
        this.partnerOid.set(oid);
        this._picked.set(this.picker.choices().find((p) => p.oid === oid) ?? null);
        this.picker.holdValue(oid);
    }

    save(): void {
        this.tried.set(true);
        if (this.incomplete()) return;
        // A partner made inactive since keeps their line; their name comes from the line itself.
        const partner = this._picked();
        const line = this.line();
        this.saved.emit({
            partner_oid: this.partnerOid()!,
            name: partner?.name ?? line?.name ?? '',
            partner_type: partner?.partner_type ?? line!.partner_type,
            agreed_fee: this.fee()!,
            note: this.note().trim() || null,
        });
    }
}
