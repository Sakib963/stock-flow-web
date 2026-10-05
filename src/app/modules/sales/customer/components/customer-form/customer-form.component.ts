import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { TranslatePipe } from '@ngx-translate/core';
import { CUSTOMER_AGE_BANDS, CUSTOMER_GENDERS, Customer, CustomerAgeBand, CustomerGender, CustomerPayload, CustomerStatus } from '@app/core/models/customer.model';
import { AddressFormComponent } from '@app/modules/sales/customer/components/address-form/address-form.component';
import { mobileValidator, normalizePhone } from '@app/shared/utils/phone/phone';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

/**
 * The customer form, rendered by the create page and the edit page. A new customer may bring their
 * first address with them, so one taken from a chat is saved in one step; after that, addresses are
 * kept on the record page.
 */
@Component({
    selector: 'customer-form',
    imports: [FormsModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzSelectModule, NzSwitchModule, TranslatePipe, AddressFormComponent],
    templateUrl: './customer-form.component.html',
    styleUrl: './customer-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;

    readonly formId = 'customer-form';
    readonly genders = CUSTOMER_GENDERS;
    readonly ageBands = CUSTOMER_AGE_BANDS;

    readonly editing = input<Customer | null>(null);
    /** Only someone who sells online is offered the first address; a counter-only person never sees addresses. */
    readonly withAddress = input(false);
    readonly submitted = output<void>();

    readonly addAddress = signal(false);
    private readonly _address = viewChild(AddressFormComponent);
    /** Who already has the phone the server refused, so the field can name them. */
    readonly phoneOwner = signal<string | null>(null);

    readonly form = this._builder.group({
        name: ['', [Validators.required, Validators.maxLength(255)]],
        phone: ['', [Validators.required, mobileValidator]],
        status: ['Active' as CustomerStatus],
        gender: ['' as CustomerGender | ''],
        age_band: ['' as CustomerAgeBand | ''],
        social_handle: ['', [Validators.maxLength(255)]],
        note: ['', [Validators.maxLength(1000)]],
    });

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
    readonly remaining = computed(() => {
        const value = this._value();
        return [value.name, value.phone].filter((field) => !field?.trim()).length;
    });

    constructor() {
        effect(() => {
            const customer = this.editing();
            if (!customer) return;
            this.form.setValue({
                name: customer.name,
                phone: customer.phone,
                status: customer.status,
                gender: customer.gender ?? '',
                age_band: customer.age_band ?? '',
                social_handle: customer.social_handle ?? '',
                note: customer.note ?? '',
            });
            this.form.markAsPristine();
        });
        this.form.controls.phone.valueChanges.subscribe(() => this.phoneOwner.set(null));
    }

    /** Dirty when anything was typed, the first address included. */
    dirty(): boolean {
        return this.form.dirty || !!this._address()?.form.dirty;
    }

    valid(): boolean {
        revealErrors(this.form);
        const address = this.addAddress() ? (this._address()?.valid() ?? false) : true;
        return this.form.valid && address;
    }

    markPristine(): void {
        this.form.markAsPristine();
        this._address()?.form.markAsPristine();
    }

    payload(): CustomerPayload {
        const raw = this.form.getRawValue();
        const address = this.addAddress() ? this._address()?.payload() : undefined;
        return {
            ...(this.editing() ? { oid: this.editing()!.oid, status: raw.status } : {}),
            name: raw.name.trim(),
            phone: normalizePhone(raw.phone) ?? raw.phone.trim(),
            gender: raw.gender || null,
            age_band: raw.age_band || null,
            social_handle: raw.social_handle.trim() || null,
            note: raw.note.trim() || null,
            ...(address ? { address: { ...address, is_default: true } } : {}),
        };
    }

    /** The database refused the phone: it is someone else's. */
    rejectPhone(owner: string | null): void {
        this.phoneOwner.set(owner);
        const control = this.form.controls.phone;
        control.setErrors({ ...(control.errors ?? {}), taken: true });
        control.markAsTouched();
    }

    invalid(field: keyof typeof this.form.controls): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }
}
