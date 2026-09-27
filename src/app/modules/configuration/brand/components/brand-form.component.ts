import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFilterOptionType, NzSelectModule } from 'ng-zorro-antd/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, filter, map, startWith, take } from 'rxjs';

import { Brand, BrandField, BrandFormField, BrandPayload, BrandStatus } from '@app/core/models/brand.model';
import { BrandService } from '@app/modules/configuration/brand/services/brand.service';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { uniqueValue } from '@app/shared/utils/unique-value/unique-value';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { LanguageService } from '@app/core/services/language/language.service';
import { ORIGIN_COUNTRIES, countryName } from '@app/modules/configuration/brand/constants/origin-countries';

/** The id each field's control, helper and error share. */
const FIELD_ID: Record<BrandFormField, string> = {
    name: 'brand-name',
    origin_country: 'brand-origin',
    description: 'brand-description',
    status: 'brand-status',
};

/**
 * The brand form itself, rendered by both the create page and the edit page.
 *
 * It owns the fields and what makes them valid, and nothing else: no route, no saving, no
 * navigation. The page around it decides what a valid form means.
 */
@Component({
    selector: 'brand-form',
    imports: [DigitsPipe, ReactiveFormsModule, NzFormModule, NzInputModule, NzSelectModule, TranslatePipe],
    templateUrl: './brand-form.component.html',
    styleUrl: './brand-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _brands = inject(BrandService);
    private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly _language = inject(LanguageService).current;

    readonly formId = 'brand-form';

    /** The brand being edited, so its own name is not reported as taken. */
    readonly editing = input<Brand | null>(null);

    readonly submitted = output<void>();

    readonly form = this._builder.group({
        name: ['', [Validators.required, Validators.maxLength(255)], [uniqueValue((value) => this._brands.isAvailable(value, this.editing()?.oid), { isOwn: (value) => this.isOwn('name', value) })]],
        origin_country: [null as string | null],
        description: ['', [Validators.maxLength(1000)]],
        status: ['Active' as BrandStatus, [Validators.required]],
    });

    private readonly _status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    /** What Save is still waiting for, counted for the action bar. */
    readonly remaining = computed(() => {
        const value = this._value();
        return [value.name, value.status].filter((field) => !field?.toString().trim()).length;
    });

    readonly checking = computed(() => this._status() === 'PENDING');

    /**
     * Named in the language on screen, sorted by that name. Each also carries its English name and
     * code to search on, because people type "Korea" or "KR" whatever language the page is in.
     */
    readonly countries = computed(() => {
        const language = this._language();
        return ORIGIN_COUNTRIES.map((code) => {
            const name = countryName(code, language);
            return { code, name, search: `${name} ${countryName(code, 'en')} ${code}`.toLowerCase() };
        }).sort((a, b) => a.name.localeCompare(b.name, language));
    });

    private readonly _searchText = computed(() => new Map<string, string>(this.countries().map((country) => [country.code, country.search])));

    readonly matchCountry: NzFilterOptionType = (input, option) => !!this._searchText().get(option.nzValue as string)?.includes(input.trim().toLowerCase());

    constructor() {
        // The two selects have no error state, so their descriptions never change and are set once.
        afterNextRender(() => {
            for (const field of ['status', 'origin_country'] as const) this._host.nativeElement.querySelector(`#${FIELD_ID[field]}`)?.setAttribute('aria-describedby', `${FIELD_ID[field]}-help`);
        });

        // The record arrives after the form does, because the page has to fetch it first. Filling
        // from the input means the page hands over what it loaded and nothing reaches into here.
        effect(() => {
            const brand = this.editing();
            if (!brand) return;

            this.form.setValue({
                name: brand.name,
                origin_country: brand.origin_country ?? null,
                description: brand.description ?? '',
                status: brand.status,
            });
            // Loading a record is not someone typing, so leaving straight after must not ask.
            this.form.markAsPristine();
        });
    }

    payload(): BrandPayload {
        const raw = this.form.getRawValue();
        return {
            ...(this.editing()?.oid ? { oid: this.editing()!.oid } : {}),
            name: raw.name.trim(),
            origin_country: raw.origin_country || null,
            description: raw.description.trim() || null,
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
    reject(field: BrandField): void {
        const control = this.form.controls[field];
        control.setErrors({ ...(control.errors ?? {}), taken: true });
        control.markAsTouched();
    }

    /** Case does not matter: the unique index compares case-insensitively, and the brand is excluded from its own check anyway. */
    private isOwn(field: BrandField, value: string): boolean {
        const own = this.editing()?.[field];
        return !!own && own.trim().toLowerCase() === value.toLowerCase();
    }

    invalid(field: BrandFormField): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    /** Whichever of the two is on screen: the error replaces the helper, it never stacks with it. */
    describedBy(field: BrandFormField): string {
        return `${FIELD_ID[field]}-${this.invalid(field) ? 'error' : 'help'}`;
    }

}
