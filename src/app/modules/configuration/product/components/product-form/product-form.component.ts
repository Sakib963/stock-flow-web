import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSparkles } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, filter, map, startWith, take } from 'rxjs';

import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Choice, RemoteChoices } from '@app/core/models/filter.model';
import { Product, ProductField, ProductFormField, ProductPayload, ProductStatus, ProductUnit, SubCategoryChoice } from '@app/core/models/product.model';
import { PRODUCT_UNITS } from '@app/modules/configuration/product/constants/product-copy';
import { ProductPhotoComponent } from '@app/modules/configuration/product/components/product-photo/product-photo.component';
import { ProductService } from '@app/modules/configuration/product/services/product.service';
import { ChoicesService } from '@app/shared/services/choices/choices.service';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { uniqueValue } from '@app/shared/utils/unique-value/unique-value';

const BRANDS: RemoteChoices = { endpoint: APIEndpoint.GET_BRAND_LIST_FOR_DROPDOWN };

const FIELD_ID: Record<ProductFormField, string> = {
    name: 'product-name',
    sku: 'product-sku',
    sub_category_oid: 'product-sub-category',
    brand_oid: 'product-brand',
    unit_type: 'product-unit',
    restock_threshold: 'product-restock',
    description: 'product-description',
    status: 'product-status',
    has_expiry: 'product-expiry',
};

/** The selects, whose input is inside ng-zorro's component, so their descriptions are attached once rendered. */
const SELECTS: readonly ProductFormField[] = ['sub_category_oid', 'brand_oid', 'unit_type', 'status'];

/** The product form, rendered by both the create page and the edit page. */
@Component({
    selector: 'product-form',
    imports: [DigitsPipe, ReactiveFormsModule, NgIcon, NzButtonModule, NzFormModule, NzInputModule, NzSelectModule, NzSwitchModule, TranslatePipe, TextPipe, ProductPhotoComponent],
    providers: [ChoicesService, provideIcons({ lucideSparkles })],
    templateUrl: './product-form.component.html',
    styleUrl: './product-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _products = inject(ProductService);
    private readonly _choices = inject(ChoicesService);
    private readonly _codes = inject(CodeGeneratorService);
    private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly formId = 'product-form';
    readonly units = PRODUCT_UNITS;

    readonly editing = input<Product | null>(null);

    readonly submitted = output<void>();

    // Declared before the group, because the photo control's validator reads it.
    readonly photoBusy = signal(false);

    readonly form = this._builder.group({
        name: ['', [Validators.required, Validators.maxLength(255)]],
        sku: ['', [Validators.maxLength(64), Validators.pattern(/^[A-Za-z0-9._-]*$/)], [uniqueValue((value) => this._products.isAvailable(value, this.editing()?.oid), { isOwn: (value) => this.isOwnSku(value) })]],
        sub_category_oid: ['', [Validators.required]],
        brand_oid: [null as string | null],
        unit_type: [null as ProductUnit | null],
        restock_threshold: [0, [Validators.required, Validators.min(0), Validators.max(9999), Validators.pattern(/^\d+$/)]],
        description: ['', [Validators.maxLength(1000)]],
        // Invalid while a photo uploads, so Save cannot send the form without it.
        photo: [null as string | null, [() => (this.photoBusy() ? { uploading: true } : null)]],
        status: ['Active' as ProductStatus, [Validators.required]],
        has_expiry: [false],
    });

    private readonly _status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly remaining = computed(() => {
        const value = this._value();
        return [value.name, value.sub_category_oid, value.status, value.restock_threshold].filter((field) => field === undefined || field === null || !field.toString().trim()).length;
    });

    readonly checking = computed(() => this._status() === 'PENDING');

    private readonly _subCategories = signal<readonly SubCategoryChoice[]>([]);
    private readonly _brands = signal<readonly Choice[]>([]);
    readonly pickersLoading = signal(true);
    readonly pickersFailed = signal(false);

    /**
     * Grouped by category. The record's own sub-category is added when it has since been turned
     * Inactive, so the picker names it rather than showing a bare id.
     */
    readonly subCategoryGroups = computed(() => {
        const record = this.editing();
        const loaded = this._subCategories();
        const all = record?.sub_category_name && !loaded.some((choice) => choice.value === record.sub_category_oid) ? [{ value: record.sub_category_oid, label: record.sub_category_name, groupLabel: record.category_name ?? '' }, ...loaded] : loaded;
        const groups = new Map<string, SubCategoryChoice[]>();
        for (const choice of all) groups.set(choice.groupLabel, [...(groups.get(choice.groupLabel) ?? []), choice]);
        return [...groups].map(([label, options]) => ({ label, options }));
    });

    readonly brands = computed<readonly Choice[]>(() => {
        const record = this.editing();
        const loaded = this._brands();
        if (!record?.brand_oid || !record.brand_name || loaded.some((choice) => choice.value === record.brand_oid)) return loaded;
        return [{ value: record.brand_oid, label: record.brand_name }, ...loaded];
    });

    constructor() {
        afterNextRender(() => {
            for (const field of SELECTS) this._host.nativeElement.querySelector(`#${FIELD_ID[field]}`)?.setAttribute('aria-describedby', `${FIELD_ID[field]}-help`);
        });

        this.loadPickers();

        effect(() => {
            const record = this.editing();
            if (!record) return;

            this.form.setValue({
                name: record.name,
                sku: record.sku ?? '',
                sub_category_oid: record.sub_category_oid,
                brand_oid: record.brand_oid,
                unit_type: record.unit_type,
                restock_threshold: record.restock_threshold,
                description: record.description ?? '',
                photo: record.photo,
                status: record.status,
                has_expiry: record.has_expiry ?? false,
            });
            this.form.markAsPristine();
        });
    }

    loadPickers(): void {
        this.pickersLoading.set(true);
        this.pickersFailed.set(false);
        this._products.subCategories().subscribe({
            next: (choices) => {
                this._subCategories.set(choices);
                this.pickersLoading.set(false);
            },
            error: () => {
                this.pickersLoading.set(false);
                this.pickersFailed.set(true);
            },
        });
        this._choices.load(BRANDS).subscribe({ next: (choices) => this._brands.set(choices), error: () => this.pickersFailed.set(true) });
    }

    photoChanged(url: string | null): void {
        this.form.controls.photo.setValue(url);
        this.form.controls.photo.markAsDirty();
    }

    photoBusyChanged(busy: boolean): void {
        this.photoBusy.set(busy);
        this.form.controls.photo.updateValueAndValidity();
    }

    payload(): ProductPayload {
        const raw = this.form.getRawValue();
        return {
            ...(this.editing()?.oid ? { oid: this.editing()!.oid } : {}),
            name: raw.name.trim(),
            sku: raw.sku.trim().toUpperCase() || null,
            sub_category_oid: raw.sub_category_oid,
            brand_oid: raw.brand_oid || null,
            unit_type: raw.unit_type || null,
            restock_threshold: Number(raw.restock_threshold),
            description: raw.description.trim() || null,
            photo: raw.photo,
            status: raw.status,
            has_expiry: raw.has_expiry,
        };
    }

    /** Whether the form may be sent, once the SKU check in flight has answered. */
    ready(): Observable<boolean> {
        revealErrors(this.form);
        return this.form.statusChanges.pipe(
            startWith(this.form.status),
            filter((status) => status !== 'PENDING'),
            take(1),
            map((status) => status === 'VALID')
        );
    }

    /** Marks the field the server refused: a taken SKU, or a parent that is no longer Active. */
    reject(field: ProductField): void {
        const control = this.form.controls[field];
        control.setErrors({ ...(control.errors ?? {}), [field === 'sku' ? 'taken' : 'inactive']: true });
        control.markAsTouched();
    }

    private isOwnSku(value: string): boolean {
        const own = this.editing()?.sku;
        return !!own && own.trim().toUpperCase() === value.toUpperCase();
    }

    invalid(field: ProductFormField): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    describedBy(field: ProductFormField): string {
        return `${FIELD_ID[field]}-${this.invalid(field) ? 'error' : 'help'}`;
    }

    generateSku(): void {
        this._codes.ask({ name: this.form.controls.name.value, generate: (name) => this._products.generateSku(name, this.editing()?.oid) }).subscribe((sku) => {
            if (!sku) return;
            this.form.controls.sku.setValue(sku);
            this.form.controls.sku.markAsDirty();
        });
    }
}
