import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBan, lucideCheck, lucideCircleCheck, lucideInfo, lucideReceipt, lucideRotateCw, lucideWallet, lucideX, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { REFUND_METHODS, RefundMethod } from '@app/core/models/order.model';
import { PageBack } from '@app/core/models/page-header.model';
import { ReturnCondition, ReturnDetails } from '@app/core/models/return.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ORDER_ROUTES } from '@app/modules/sales/order/constants/order-routes';
import { RETURN_REASON, RETURN_STATUS } from '@app/modules/sales/return/config/return-list.config';
import { RETURN_ROUTES } from '@app/modules/sales/return/constants/return-routes';
import { ReturnService } from '@app/modules/sales/return/services/return.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

type Dialog = 'confirm' | 'cancel';

/**
 * One return. Pending moves nothing; Confirm restocks the Good units to their batch and disposes the
 * Damaged ones, and is where the condition is settled, because that is when the goods are in hand.
 */
@Component({
    selector: 'return-detail',
    imports: [FormsModule, RouterLink, NgIcon, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzModalModule, NzRadioModule, NzSelectModule, NzSkeletonModule, NzTableModule, NzTypographyModule, TranslatePipe, PageHeaderComponent, ActionFooterComponent, StatusTagComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBan, lucideCheck, lucideCircleCheck, lucideInfo, lucideReceipt, lucideRotateCw, lucideWallet, lucideX, lucideZap })],
    templateUrl: './return-detail.component.html',
    styleUrl: './return-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _returns = inject(ReturnService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: RETURN_ROUTES.list };
    readonly orderRoute = ORDER_ROUTES.detail;
    readonly canViewOrders = this._session.can('sales.order.view');

    private readonly _seed = this.seedFromList();
    readonly record = signal<ReturnDetails | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    readonly saving = this._returns.saving;
    readonly ret = computed<Partial<ReturnDetails> | null>(() => this.record() ?? this._seed);
    readonly statusTone = computed(() => this.toneOf(RETURN_STATUS, this.ret()?.status));
    readonly reasonTone = computed(() => this.toneOf(RETURN_REASON, this.ret()?.return_reason));

    readonly actions = computed(() => {
        const pending = this.record()?.status === 'Pending';
        return { confirm: pending && this._session.can('sales.return.confirm'), cancel: pending && this._session.can('sales.return.cancel') };
    });

    readonly dialog = signal<Dialog | null>(null);
    readonly confirming = signal(false);
    readonly conditions = signal<Record<string, ReturnCondition>>({});
    readonly refundMethods = REFUND_METHODS;
    readonly refundMethod = signal<RefundMethod | null>(null);
    readonly cancelReason = signal('');
    /** At the counter the money goes back on the spot (decided by the user, 2026-10-10), so it says how. */
    readonly needsMethod = computed(() => this.record()?.channel === 'POS' && (this.record()?.refund_amount ?? 0) > 0);
    readonly dialogIncomplete = computed(() => (this.dialog() === 'cancel' ? !this.cancelReason().trim() : this.needsMethod() && !this.refundMethod()));

    constructor() {
        this.load();
    }

    load(): void {
        this.failed.set(null);
        this._returns.details(this.oid).subscribe({
            next: (details) => this.record.set(details),
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(RETURN_ROUTES.list);
    }

    reasonText(r: Partial<ReturnDetails>): string {
        const t = (key: string) => this._translate.instant(key);
        const sub = r.not_delivered_reason ? t('sales.order.notDeliveredReason.' + r.not_delivered_reason) : '';
        return [sub, r.notes].filter(Boolean).join(': ');
    }

    open(dialog: Dialog): void {
        this.conditions.set(Object.fromEntries((this.record()?.items ?? []).map((line) => [line.oid, line.condition])));
        this.refundMethod.set(null);
        this.cancelReason.set('');
        this.confirming.set(false);
        this.dialog.set(dialog);
    }

    setCondition(line: string, condition: ReturnCondition): void {
        this.conditions.update((all) => ({ ...all, [line]: condition }));
    }

    /** Asks inside the same dialog, never a second modal on top. */
    submitDialog(): void {
        const dialog = this.dialog();
        if (!dialog || this.dialogIncomplete() || this.saving()) return;
        if (!this.confirming()) {
            this.confirming.set(true);
            return;
        }
        const changed = (this.record()?.items ?? []).filter((line) => this.conditions()[line.oid] !== line.condition).map((line) => ({ oid: line.oid, condition: this.conditions()[line.oid] }));
        const send = dialog === 'confirm' ? this._returns.confirm({ oid: this.oid, conditions: changed, ...(this.needsMethod() ? { refund_method: this.refundMethod()! } : {}) }) : this._returns.cancel(this.oid, this.cancelReason().trim());
        send.pipe(finalize(() => this.confirming.set(false))).subscribe({
            next: () => {
                this.dialog.set(null);
                this._message.success(this._translate.instant('sales.return.action.' + dialog + '.done'));
                this.load();
            },
            error: (error: unknown) => {
                if (error instanceof HttpErrorResponse && error.status === 409) {
                    this._message.error(error.error?.message ?? this._translate.instant('sales.order.movedOn'));
                    this.dialog.set(null);
                    this.load();
                    return;
                }
                this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
            },
        });
    }

    private toneOf(map: typeof RETURN_STATUS, value: string | null | undefined) {
        return value ? (resolveTone(map, value, undefined, 'the return record')?.style ?? null) : null;
    }

    private seedFromList(): Partial<ReturnDetails> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<ReturnDetails> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
