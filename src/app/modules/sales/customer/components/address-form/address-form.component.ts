import { ChangeDetectionStrategy, Component, DestroyRef, WritableSignal, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { AddressPayload, CustomerAddress, Place } from '@app/core/models/customer.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { CustomerService } from '@app/modules/sales/customer/services/customer.service';
import { mobileValidator, normalizePhone } from '@app/shared/utils/phone/phone';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/**
 * One address: who receives it, and where. The thana is picked under the district, and only from
 * the server's list, so a parcel is never counted in two places (sales REQ-61, REQ-85).
 */
@Component({
    selector: 'address-form',
    imports: [ReactiveFormsModule, NzSpinModule, NzCheckboxModule, NzFormModule, NzInputModule, NzSelectModule, TranslatePipe],
    templateUrl: './address-form.component.html',
    styleUrl: './address-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _customers = inject(CustomerService);
    private readonly _districtSearch = new Subject<string>();
    private readonly _thanaSearch = new Subject<string>();

    readonly language = inject(LanguageService).current;
    /** Keeps the ids unique when the form is on the page twice. */
    readonly idPrefix = input('address');
    readonly editing = input<CustomerAddress | null>(null);
    /** A first address is always the default, so the box would only mislead. */
    readonly showDefault = input(true);

    readonly form = this._builder.group({
        label: ['', [Validators.maxLength(64)]],
        recipient_name: ['', [Validators.required, Validators.maxLength(255)]],
        recipient_phone: ['', [mobileValidator]],
        district_oid: ['', [Validators.required]],
        thana_oid: ['', [Validators.required]],
        address_line: ['', [Validators.required, Validators.maxLength(1000)]],
        area_text: ['', [Validators.maxLength(128)]],
        postal_code: ['', [Validators.pattern(/^\d{4}$/)]],
        is_default: [false],
    });

    readonly districts = signal<Place[]>([]);
    readonly thanas = signal<Place[]>([]);
    readonly searchingDistricts = signal(false);
    readonly searchingThanas = signal(false);
    /** A search that failed says so in the picker, instead of reading as a place that does not exist. */
    readonly placesFailed = signal<RequestFailure | null>(null);

    readonly placeName = computed(() => (place: Place) => (this.language() === 'bn' ? place.name_bn : place.name_en));

    constructor() {
        const destroyRef = inject(DestroyRef);
        const answered = (searching: WritableSignal<boolean>, target: WritableSignal<Place[]>) => (outcome: Place[] | RequestFailure) => {
            searching.set(false);
            if (Array.isArray(outcome)) {
                this.placesFailed.set(null);
                target.set(outcome);
            } else this.placesFailed.set(outcome);
        };
        this._districtSearch
            .pipe(
                debounceTime(200),
                switchMap((text) => this._customers.districts(text).pipe(catchError((error: unknown) => of(failureOf(error))))),
                takeUntilDestroyed(destroyRef)
            )
            .subscribe(answered(this.searchingDistricts, this.districts));
        this._thanaSearch
            .pipe(
                debounceTime(200),
                switchMap((text) => this._customers.thanas(this.form.controls.district_oid.value, text).pipe(catchError((error: unknown) => of(failureOf(error))))),
                takeUntilDestroyed(destroyRef)
            )
            .subscribe(answered(this.searchingThanas, this.thanas));

        // The record arrives after the form does; its district and thana are seeded as the only
        // choices so the selects show their names before anyone searches.
        effect(() => {
            const address = this.editing();
            if (!address) return;
            // An address read from a chat message may come without a place yet.
            this.districts.set(address.district_oid ? [{ oid: address.district_oid, name_en: address.district_name_en, name_bn: address.district_name_bn }] : []);
            this.thanas.set(address.thana_oid ? [{ oid: address.thana_oid, name_en: address.thana_name_en, name_bn: address.thana_name_bn }] : []);
            this.form.setValue({
                label: address.label ?? '',
                recipient_name: address.recipient_name,
                recipient_phone: address.recipient_phone ?? '',
                district_oid: address.district_oid,
                thana_oid: address.thana_oid,
                address_line: address.address_line,
                area_text: address.area_text ?? '',
                postal_code: address.postal_code ?? '',
                is_default: address.is_default,
            });
            this.form.markAsPristine();
        });
    }

    searchDistricts(text: string): void {
        this.searchingDistricts.set(true);
        this._districtSearch.next(text);
    }

    searchThanas(text: string): void {
        if (!this.form.controls.district_oid.value) return;
        this.searchingThanas.set(true);
        this._thanaSearch.next(text);
    }

    districtPicked(): void {
        this.form.controls.thana_oid.setValue('');
        this.thanas.set([]);
        this.searchThanas('');
    }

    /** A thana's post code fills an empty post code box; one already typed is left alone. */
    thanaPicked(oid: string): void {
        const code = this.thanas().find((place) => place.oid === oid)?.postal_code;
        const box = this.form.controls.postal_code;
        if (code && !box.value.trim()) box.setValue(code);
    }

    valid(): boolean {
        revealErrors(this.form);
        return this.form.valid;
    }

    payload(): AddressPayload {
        const raw = this.form.getRawValue();
        return {
            label: raw.label.trim() || null,
            recipient_name: raw.recipient_name.trim(),
            recipient_phone: raw.recipient_phone.trim() ? normalizePhone(raw.recipient_phone) : null,
            address_line: raw.address_line.trim(),
            district_oid: raw.district_oid,
            thana_oid: raw.thana_oid,
            area_text: raw.area_text.trim() || null,
            postal_code: raw.postal_code.trim() || null,
            is_default: raw.is_default,
        };
    }

    id(field: string): string {
        return `${this.idPrefix()}-${field}`;
    }

    invalid(field: keyof typeof this.form.controls): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }
}
