import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBan, lucideBanknote, lucideCalendarClock, lucideCheck, lucideCircleCheck, lucideEye, lucideFlag, lucideHandCoins, lucideHistory, lucideInfo, lucideMapPin, lucidePackageCheck, lucidePackageX, lucidePencil, lucidePlus, lucideReceipt, lucideRotateCw, lucideShoppingBag, lucideStar, lucideTrash2, lucideTrendingUp, lucideX, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { CUSTOMER_FLAGS, Customer, CustomerAddress, CustomerDetails, CustomerFlag } from '@app/core/models/customer.model';
import { PageBack } from '@app/core/models/page-header.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { AddressFormComponent } from '@app/modules/sales/customer/components/address-form/address-form.component';
import { CUSTOMER_FLAG, CUSTOMER_STATUS } from '@app/modules/sales/customer/config/customer-list.config';
import { CUSTOMER_ROUTES } from '@app/modules/sales/customer/constants/customer-routes';
import { CustomerService } from '@app/modules/sales/customer/services/customer.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

interface CustomerStat {
    key: string;
    label: string;
    value: number | null;
    icon: string;
    format: 'money' | 'number';
    unit?: string;
    alert?: boolean;
}

/**
 * One customer (sales REQ-66): the record first, then the numbers, the addresses, the orders, and
 * activity beside quick actions. A counter-only person gets no addresses from the server and sees
 * no address section at all.
 */
@Component({
    selector: 'customer-detail',
    imports: [FormsModule, NgIcon, NzButtonModule, NzCardModule, NzDrawerModule, NzInputModule, NzModalModule, NzRadioModule, NzSkeletonModule, NzTableModule, NzTimelineModule, NzTooltipModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, AddressFormComponent, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBan, lucideBanknote, lucideCalendarClock, lucideCheck, lucideCircleCheck, lucideEye, lucideFlag, lucideHandCoins, lucideHistory, lucideInfo, lucideMapPin, lucidePackageCheck, lucidePackageX, lucidePencil, lucidePlus, lucideReceipt, lucideRotateCw, lucideShoppingBag, lucideStar, lucideTrash2, lucideTrendingUp, lucideX, lucideZap })],
    templateUrl: './customer-detail.component.html',
    styleUrl: './customer-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _customers = inject(CustomerService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: CUSTOMER_ROUTES.list };
    readonly record = signal<CustomerDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    readonly customer = computed<Partial<Customer> | null>(() => this.record()?.details ?? this._seed);
    readonly canEdit = this._session.can('sales.customer.edit');
    readonly canAddAddress = this._session.can('sales.customer.create');
    readonly saving = this._customers.saving;

    readonly statusTone = computed(() => {
        const status = this.customer()?.status;
        return status ? resolveTone(CUSTOMER_STATUS, status, undefined, 'the customer status')?.style : null;
    });
    readonly flagTone = computed(() => {
        const flag = this.customer()?.flag;
        return flag && flag !== 'None' ? resolveTone(CUSTOMER_FLAG, flag, undefined, 'the customer flag')?.style : null;
    });

    /** Delivery figures only mean something to someone who sells online, so only they see them. */
    readonly stats = computed<CustomerStat[]>(() => {
        const loaded = this.record();
        if (!loaded) return [];
        const s = loaded.stats;
        const online = loaded.channels.includes('ONLINE');
        return [
            { key: 'sales', label: 'sales.customer.stat.sales', value: s.sales, icon: 'lucideShoppingBag', format: 'number' as const },
            { key: 'value', label: 'sales.customer.stat.lifetimeValue', value: s.lifetime_value, icon: 'lucideTrendingUp', format: 'money' as const },
            { key: 'average', label: 'sales.customer.stat.averageOrder', value: s.average_order, icon: 'lucideReceipt', format: 'money' as const },
            { key: 'owed', label: 'sales.customer.stat.owed', value: s.owed, icon: 'lucideHandCoins', format: 'money' as const, alert: s.owed > 0 },
            ...(online
                ? [
                      { key: 'delivered', label: 'sales.customer.stat.deliveredRate', value: s.delivered_rate, icon: 'lucidePackageCheck', format: 'number' as const, unit: '%' },
                      { key: 'refused', label: 'sales.customer.stat.refused', value: s.refused_parcels, icon: 'lucidePackageX', format: 'number' as const, alert: s.refused_parcels > 0 },
                  ]
                : [{ key: 'orders', label: 'sales.customer.stat.orders', value: s.orders, icon: 'lucideBanknote', format: 'number' as const }]),
        ];
    });

    // The address drawer: the address being edited, or 'new'.
    readonly addressOpen = signal<CustomerAddress | 'new' | null>(null);
    private readonly _addressForm = viewChild(AddressFormComponent);

    // The flag dialog.
    readonly flagOpen = signal(false);
    readonly flagConfirming = signal(false);
    readonly flags = CUSTOMER_FLAGS;
    readonly flagChoice = signal<CustomerFlag>('None');
    readonly flagReason = signal('');
    readonly flagReasonMissing = computed(() => this.flagChoice() !== 'None' && !this.flagReason().trim());

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._customers.details(this.oid).subscribe({
            next: (details) => {
                this.record.set(details);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    edit(): void {
        void this._router.navigateByUrl(CUSTOMER_ROUTES.edit(this.oid));
    }

    backToList(): void {
        void this._router.navigateByUrl(CUSTOMER_ROUTES.list);
    }

    placeOf(address: CustomerAddress): string {
        const bn = this.language() === 'bn';
        return [address.area_text, bn ? address.thana_name_bn : address.thana_name_en, bn ? address.district_name_bn : address.district_name_en].filter(Boolean).join(', ');
    }

    editingAddress(): CustomerAddress | null {
        const open = this.addressOpen();
        return open && open !== 'new' ? open : null;
    }

    saveAddress(): void {
        const form = this._addressForm();
        const open = this.addressOpen();
        if (!form || !open || this.saving()) return;
        if (!form.valid()) {
            this._message.error(this._translate.instant('form.fixErrors'));
            return;
        }
        const payload = form.payload();
        this.ask('sales.customer.address.confirmSave', { name: payload.recipient_name }, 'sales.customer.address.save').subscribe((confirmed) => {
            if (!confirmed) return;
            const request = open === 'new' ? this._customers.addAddress(this.oid, payload) : this._customers.updateAddress(open.oid, payload);
            request.subscribe({
                next: () => {
                    this.addressOpen.set(null);
                    this._message.success(this._translate.instant('sales.customer.address.saved'));
                    this.load();
                },
                error: (error: unknown) => this.writeFailed(error),
            });
        });
    }

    makeDefault(address: CustomerAddress): void {
        if (this.saving()) return;
        const { label, recipient_name, recipient_phone, address_line, district_oid, thana_oid, area_text, postal_code } = address;
        this.ask('sales.customer.address.confirmDefault', { place: this.placeOf(address) }, 'sales.customer.address.makeDefault').subscribe((confirmed) => {
            if (!confirmed) return;
            this._customers.updateAddress(address.oid, { label, recipient_name, recipient_phone, address_line, district_oid, thana_oid, area_text, postal_code, is_default: true }).subscribe({
                next: () => {
                    this._message.success(this._translate.instant('sales.customer.address.defaultSet'));
                    this.load();
                },
                error: (error: unknown) => this.writeFailed(error),
            });
        });
    }

    removeAddress(address: CustomerAddress): void {
        confirmAction(this._modal, {
            title: this._translate.instant('sales.customer.address.confirmRemove.title'),
            body: this._translate.instant('sales.customer.address.confirmRemove.body', { place: this.placeOf(address) }),
            ok: this._translate.instant('sales.customer.address.remove'),
            cancel: this._translate.instant('form.confirm.cancel'),
            danger: true,
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            this._customers.removeAddress(address.oid).subscribe({
                next: () => {
                    this._message.success(this._translate.instant('sales.customer.address.removed'));
                    this.load();
                },
                error: (error: unknown) => this.writeFailed(error),
            });
        });
    }

    openFlag(): void {
        const customer = this.record()?.details;
        if (!customer) return;
        this.flagChoice.set(customer.flag);
        this.flagReason.set(customer.flag_reason ?? '');
        this.flagConfirming.set(false);
        this.flagOpen.set(true);
    }

    saveFlag(): void {
        if (this.flagReasonMissing() || this.saving()) return;
        if (!this.flagConfirming()) {
            this.flagConfirming.set(true);
            return;
        }
        this._customers.flag(this.oid, this.flagChoice(), this.flagReason().trim() || null).subscribe({
            next: (changed) => {
                this.flagOpen.set(false);
                this._message[changed ? 'success' : 'info'](this._translate.instant(changed ? 'sales.customer.flagSaved' : 'form.nothingChanged'));
                this.load();
            },
            error: (error: unknown) => this.writeFailed(error),
        });
    }

    private ask(key: string, params: Record<string, string>, ok: string) {
        return confirmAction(this._modal, {
            title: this._translate.instant(key + '.title'),
            body: this._translate.instant(key + '.body', params),
            ok: this._translate.instant(ok),
            cancel: this._translate.instant('form.confirm.cancel'),
        });
    }

    /** A 409 is the record having moved on under someone else's hands: reload and say so. */
    private writeFailed(error: unknown): void {
        if (failureOf(error) === 'server' && (error as { status?: number })?.status === 409) {
            this._message.error(this._translate.instant('sales.customer.movedOn'));
            this.addressOpen.set(null);
            this.load();
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }

    private seedFromList(): Partial<Customer> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<Customer> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
