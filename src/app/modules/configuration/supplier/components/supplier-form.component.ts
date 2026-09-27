import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, filter, map, startWith, take } from 'rxjs';

import { Supplier, SupplierField, SupplierFormField, SupplierPayload, SupplierStatus } from '@app/core/models/supplier.model';
import { SupplierService } from '@app/modules/configuration/supplier/services/supplier.service';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { uniqueValue } from '@app/shared/utils/unique-value/unique-value';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';

/** Digits with spaces, dashes or a leading +, the same rule the server holds. */
const PHONE = /^\+?[\d\s-]{6,20}$/;

/** The id each field's control, helper and error share. */
const FIELD_ID: Record<SupplierFormField, string> = {
    name: 'supplier-name',
    contact_person: 'supplier-contact',
    phone_number: 'supplier-phone',
    whatsapp_number: 'supplier-whatsapp',
    email: 'supplier-email',
    address: 'supplier-address',
    payment_details: 'supplier-payment',
    status: 'supplier-status',
};

/**
 * The supplier form itself, rendered by both the create page and the edit page.
 *
 * It owns the fields and what makes them valid, and nothing else: no route, no saving, no
 * navigation. The page around it decides what a valid form means.
 */
@Component({
    selector: 'supplier-form',
    imports: [DigitsPipe, ReactiveFormsModule, NzFormModule, NzInputModule, NzSelectModule, TranslatePipe],
    templateUrl: './supplier-form.component.html',
    styleUrl: './supplier-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _suppliers = inject(SupplierService);
    private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly formId = 'supplier-form';

    /** The supplier being edited, so its own name and phone are not reported as taken. */
    readonly editing = input<Supplier | null>(null);

    readonly submitted = output<void>();

    readonly form = this._builder.group({
        name: ['', [Validators.required, Validators.maxLength(255)], [uniqueValue((value) => this._suppliers.isAvailable('name', value, this.editing()?.oid), { isOwn: (value) => this.isOwn('name', value) })]],
        contact_person: ['', [Validators.maxLength(255)]],
        phone_number: ['', [Validators.required, Validators.pattern(PHONE)], [uniqueValue((value) => this._suppliers.isAvailable('phone_number', value, this.editing()?.oid), { isOwn: (value) => this.isOwn('phone_number', value) })]],
        whatsapp_number: ['', [Validators.pattern(PHONE)]],
        email: ['', [Validators.email, Validators.maxLength(128)]],
        address: ['', [Validators.maxLength(1000)]],
        payment_details: ['', [Validators.maxLength(1000)]],
        status: ['Active' as SupplierStatus, [Validators.required]],
    });

    private readonly _status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    /** What Save is still waiting for, counted for the action bar. */
    readonly remaining = computed(() => {
        const value = this._value();
        return [value.name, value.phone_number, value.status].filter((field) => !field?.toString().trim()).length;
    });

    readonly checking = computed(() => this._status() === 'PENDING');

    constructor() {
        // Status has no error state, so its description never changes and is set once.
        afterNextRender(() => this._host.nativeElement.querySelector(`#${FIELD_ID.status}`)?.setAttribute('aria-describedby', `${FIELD_ID.status}-help`));

        // The record arrives after the form does, because the page has to fetch it first. Filling
        // from the input means the page hands over what it loaded and nothing reaches into here.
        effect(() => {
            const supplier = this.editing();
            if (!supplier) return;

            this.form.setValue({
                name: supplier.name,
                contact_person: supplier.contact_person ?? '',
                phone_number: supplier.phone_number,
                whatsapp_number: supplier.whatsapp_number ?? '',
                email: supplier.email ?? '',
                address: supplier.address ?? '',
                payment_details: supplier.payment_details ?? '',
                status: supplier.status,
            });
            // Loading a record is not someone typing, so leaving straight after must not ask.
            this.form.markAsPristine();
        });
    }

    payload(): SupplierPayload {
        const raw = this.form.getRawValue();
        return {
            ...(this.editing()?.oid ? { oid: this.editing()!.oid } : {}),
            name: raw.name.trim(),
            contact_person: raw.contact_person.trim() || null,
            phone_number: raw.phone_number.trim(),
            whatsapp_number: raw.whatsapp_number.trim() || null,
            email: raw.email.trim().toLowerCase() || null,
            address: raw.address.trim() || null,
            payment_details: raw.payment_details.trim() || null,
            status: raw.status,
        };
    }

    /**
     * Whether the form may be sent, once it has finished deciding.
     *
     * An async validator leaves the form PENDING while the server is being asked, and a PENDING
     * form is not valid. Reading `form.valid` at the moment Save is pressed therefore answers
     * "no" for anyone who types and saves quickly, and the press does nothing at all. This waits
     * for the checks in flight and then answers.
     */
    ready(): Observable<boolean> {
        revealErrors(this.form);

        return this.form.statusChanges.pipe(
            startWith(this.form.status),
            filter((status) => status !== 'PENDING'),
            take(1),
            map((status) => status === 'VALID')
        );
    }

    /**
     * Marks the field the database refused as taken, which is the one thing a 409 here can mean.
     *
     * It reuses the `taken` error the availability check already sets, so the refusal reads in the
     * person's own language instead of the server's English sentence.
     */
    reject(field: SupplierField): void {
        const control = this.form.controls[field];
        control.setErrors({ ...(control.errors ?? {}), taken: true });
        control.markAsTouched();
    }

    /** Compared the way the unique indexes compare: a name ignoring case, a phone on its digits alone. */
    private isOwn(field: SupplierField, value: string): boolean {
        const own = this.editing()?.[field];
        if (!own) return false;
        return field === 'phone_number' ? own.replace(/\D/g, '') === value.replace(/\D/g, '') : own.trim().toLowerCase() === value.toLowerCase();
    }

    invalid(field: SupplierFormField): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    /** Whichever of the two is on screen: the error replaces the helper, it never stacks with it. */
    describedBy(field: SupplierFormField): string {
        return `${FIELD_ID[field]}-${this.invalid(field) ? 'error' : 'help'}`;
    }
}
