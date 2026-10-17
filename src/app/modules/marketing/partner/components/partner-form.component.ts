import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, filter, map, startWith, take } from 'rxjs';

import { PARTNER_PAYMENT_METHODS, PARTNER_PLATFORMS, PARTNER_TYPES, Partner, PartnerFormField, PartnerPayload, PartnerPaymentMethod, PartnerPlatform, PartnerStatus, PartnerType } from '@app/core/models/partner.model';
import { PartnerService } from '@app/modules/marketing/partner/services/partner.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { uniqueValue } from '@app/shared/utils/unique-value/unique-value';

/** Digits with spaces, dashes or a leading +, the same rule the server holds. */
const PHONE = /^\+?[\d\s-]{6,20}$/;

/** The partner form, rendered by both the create page and the edit page. It owns the fields and nothing else. */
@Component({
    selector: 'partner-form',
    imports: [DigitsPipe, ReactiveFormsModule, NzFormModule, NzInputModule, NzSelectModule, TranslatePipe],
    templateUrl: './partner-form.component.html',
    styleUrl: './partner-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _partners = inject(PartnerService);

    readonly formId = 'partner-form';
    readonly types = PARTNER_TYPES;
    readonly platformChoices = PARTNER_PLATFORMS;
    readonly paymentMethods = PARTNER_PAYMENT_METHODS;

    /** The partner being edited, so its own name is not reported as taken. */
    readonly editing = input<Partner | null>(null);

    readonly submitted = output<void>();

    readonly form = this._builder.group({
        name: ['', [Validators.required, Validators.maxLength(255)], [uniqueValue((value) => this._partners.isAvailable(value, this.editing()?.oid), { isOwn: (value) => this.editing()?.name.trim().toLowerCase() === value.toLowerCase() })]],
        partner_type: ['' as PartnerType | '', [Validators.required]],
        status: ['Active' as PartnerStatus, [Validators.required]],
        platforms: [[] as PartnerPlatform[]],
        handle: ['', [Validators.maxLength(255)]],
        phone_number: ['', [Validators.pattern(PHONE)]],
        payment_method: ['' as PartnerPaymentMethod | ''],
        payment_account: ['', [Validators.maxLength(255)]],
        note: ['', [Validators.maxLength(1000)]],
    });

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    /** What Save is still waiting for, counted for the action bar. */
    readonly remaining = computed(() => {
        const value = this._value();
        return [value.name?.trim(), value.partner_type, value.status].filter((field) => !field).length;
    });

    constructor() {
        effect(() => {
            const partner = this.editing();
            if (!partner) return;
            this.form.setValue({
                name: partner.name,
                partner_type: partner.partner_type,
                status: partner.status,
                platforms: [...partner.platforms],
                handle: partner.handle ?? '',
                phone_number: partner.phone_number ?? '',
                payment_method: partner.payment_method ?? '',
                payment_account: partner.payment_account ?? '',
                note: partner.note ?? '',
            });
            // Loading a record is not someone typing, so leaving straight after must not ask.
            this.form.markAsPristine();
        });
    }

    payload(): PartnerPayload {
        const raw = this.form.getRawValue();
        return {
            ...(this.editing()?.oid ? { oid: this.editing()!.oid } : {}),
            name: raw.name.trim(),
            partner_type: raw.partner_type as PartnerType,
            platforms: raw.platforms,
            handle: raw.handle.trim() || null,
            phone_number: raw.phone_number.trim() || null,
            payment_method: raw.payment_method || null,
            payment_account: raw.payment_account.trim() || null,
            note: raw.note.trim() || null,
            status: raw.status,
        };
    }

    /** Waits for the name check in flight, then answers whether the form may be sent. */
    ready(): Observable<boolean> {
        revealErrors(this.form);
        return this.form.statusChanges.pipe(
            startWith(this.form.status),
            filter((status) => status !== 'PENDING'),
            take(1),
            map((status) => status === 'VALID')
        );
    }

    /** Marks the name the database refused, with the same error the availability check sets. */
    rejectName(): void {
        const control = this.form.controls.name;
        control.setErrors({ ...(control.errors ?? {}), taken: true });
        control.markAsTouched();
    }

    invalid(field: PartnerFormField): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }
}
