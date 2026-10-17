import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideGift, lucidePackage, lucideTrash2, lucideUserRound, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PageBack } from '@app/core/models/page-header.model';
import { PosBatch } from '@app/core/models/pos.model';
import { GIVEAWAY_ROUTES } from '@app/modules/sales/giveaway/constants/giveaway-routes';
import { GiveawayService } from '@app/modules/sales/giveaway/services/giveaway.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { ProductSearchComponent } from '@app/shared/components/product-search/product-search.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { normalizePhone } from '@app/shared/utils/phone/phone';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

interface GiftLine {
    inventory_oid: string;
    product_name: string;
    batch_code: string;
    sellable: number;
    quantity: number;
}

/** A gift on its own, saved as a Draft that moves nothing; the record page gives it. */
@Component({
    selector: 'giveaway-create',
    imports: [FormsModule, NgIcon, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzInputNumberModule, TranslatePipe, PageHeaderComponent, ActionFooterComponent, ProductSearchComponent, DigitsPipe],
    providers: [provideIcons({ lucideCheck, lucideGift, lucidePackage, lucideTrash2, lucideUserRound, lucideX })],
    templateUrl: './giveaway-create.component.html',
    styleUrl: './giveaway-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiveawayCreateComponent {
    private readonly _router = inject(Router);
    private readonly _giveaways = inject(GiveawayService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _query = inject(ActivatedRoute).snapshot.queryParamMap;

    readonly back: PageBack = { route: GIVEAWAY_ROUTES.list };
    readonly saving = this._giveaways.saving;
    readonly name = signal('');
    readonly phone = signal('');
    readonly address = signal('');
    readonly note = signal('');
    readonly lines = signal<GiftLine[]>([]);
    /** Errors show once Save has been pressed, not while the person is still typing. */
    readonly tried = signal(false);
    /** Made once per page, so a retried Save finds the draft it already saved. */
    private readonly _oid = crypto.randomUUID();
    /** Opened from a campaign: the gift is for that partner and counts in the campaign's cost. */
    readonly campaign = this._query.get('campaign_partner') ? { line: this._query.get('campaign_partner')!, number: this._query.get('campaign') ?? '', partner: this._query.get('partner') ?? '' } : null;

    constructor() {
        if (!this.campaign) return;
        this.name.set(this.campaign.partner);
        this.note.set(this._translate.instant('sales.giveaway.forCampaignNote', { number: this.campaign.number }));
    }

    readonly phoneInvalid = computed(() => !!this.phone().trim() && !normalizePhone(this.phone()));
    readonly over = computed(() => this.lines().some((line) => line.quantity > line.sellable));
    readonly incomplete = computed(() => !this.name().trim() || !this.note().trim() || !this.lines().length || this.phoneInvalid() || this.over());

    add(batch: PosBatch): void {
        if (this.lines().some((line) => line.inventory_oid === batch.inventory_oid)) {
            this.lines.update((all) => all.map((line) => (line.inventory_oid === batch.inventory_oid ? { ...line, quantity: Math.min(line.quantity + 1, line.sellable) } : line)));
            return;
        }
        this.lines.update((all) => [...all, { inventory_oid: batch.inventory_oid, product_name: batch.product_name, batch_code: batch.batch_code, sellable: batch.sellable_quantity, quantity: 1 }]);
    }

    setQuantity(index: number, quantity: number | null): void {
        this.lines.update((all) => all.map((line, i) => (i === index ? { ...line, quantity: Math.max(1, quantity ?? 1) } : line)));
    }

    remove(index: number): void {
        this.lines.update((all) => all.filter((_, i) => i !== index));
    }

    cancel(): void {
        void this._router.navigateByUrl(GIVEAWAY_ROUTES.list);
    }

    save(): void {
        this.tried.set(true);
        if (this.incomplete() || this.saving()) {
            this._message.error(this._translate.instant('form.fixErrors'));
            return;
        }
        confirmAction(this._modal, {
            title: this._translate.instant('sales.giveaway.action.create.confirmTitle', { name: this.name().trim() }),
            body: this._translate.instant('sales.giveaway.action.create.confirmBody'),
            ok: this._translate.instant('sales.giveaway.action.create.button'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            this._giveaways
                .create({
                    oid: this._oid,
                    recipient_name: this.name().trim(),
                    recipient_phone: this.phone().trim() || null,
                    address_line: this.address().trim() || null,
                    note: this.note().trim(),
                    campaign_partner_oid: this.campaign?.line ?? null,
                    lines: this.lines().map((line) => ({ inventory_oid: line.inventory_oid, quantity: line.quantity })),
                })
                .subscribe({
                    next: (saved) => {
                        this._message.success(this._translate.instant('sales.giveaway.action.create.done', { number: saved.giveaway_no }));
                        void this._router.navigateByUrl(GIVEAWAY_ROUTES.detail(saved.oid));
                    },
                    error: (error: unknown) => {
                        const conflict = error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400) ? (error.error?.message as string | undefined) : undefined;
                        this._message.error(conflict ?? this._translate.instant(failureKey(error, 'form.saveFailed')));
                    },
                });
        });
    }
}
