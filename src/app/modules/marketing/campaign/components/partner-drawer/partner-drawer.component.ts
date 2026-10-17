import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { TranslatePipe } from '@ngx-translate/core';
import { CampaignPartner, PartnerChoice } from '@app/core/models/campaign.model';

/** Adds or changes one partner on the campaign: who, and the fee agreed with them. */
@Component({
    selector: 'campaign-partner-drawer',
    imports: [FormsModule, NgIcon, NzButtonModule, NzDrawerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzSelectModule, TranslatePipe],
    providers: [provideIcons({ lucideCheck, lucideX })],
    templateUrl: './partner-drawer.component.html',
    styleUrl: './partner-drawer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerDrawerComponent {
    readonly open = input(false);
    /** The partner line being changed, or null to add one. */
    readonly line = input<CampaignPartner | null>(null);
    readonly choices = input<PartnerChoice[]>([]);
    readonly choicesLoading = input(false);
    /** Partners already on the campaign, offered only to the line that has them. */
    readonly taken = input<ReadonlySet<string>>(new Set());

    readonly saved = output<CampaignPartner>();
    readonly closed = output<void>();

    readonly partnerOid = signal<string | null>(null);
    readonly fee = signal<number | null>(null);
    readonly note = signal('');
    readonly tried = signal(false);

    readonly offered = computed(() => this.choices().filter((p) => !this.taken().has(p.oid) || p.oid === this.line()?.partner_oid));
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
            });
        });
    }

    save(): void {
        this.tried.set(true);
        if (this.incomplete()) return;
        // A partner made inactive since keeps their line; their name comes from the line itself.
        const partner = this.choices().find((p) => p.oid === this.partnerOid());
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
