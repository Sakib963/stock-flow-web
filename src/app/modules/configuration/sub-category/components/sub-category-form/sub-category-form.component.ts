import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideSparkles } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, filter, map, startWith, take } from 'rxjs';

import { Choice, RemoteChoices } from '@app/core/models/filter.model';
import { SubCategory, SubCategoryField, SubCategoryFormField, SubCategoryPayload, SubCategoryStatus } from '@app/core/models/sub-category.model';
import { SessionService } from '@app/core/services/session/session.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CategoryQuickAddComponent } from '@app/modules/configuration/sub-category/components/category-quick-add/category-quick-add.component';
import { SubCategoryService } from '@app/modules/configuration/sub-category/services/sub-category.service';
import { ChoicesService } from '@app/shared/services/choices/choices.service';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { uniqueValue } from '@app/shared/utils/unique-value/unique-value';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';

const CATEGORIES: RemoteChoices = { endpoint: APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN };

const FIELD_ID: Record<SubCategoryFormField, string> = {
    category_oid: 'sub-category-parent',
    name: 'sub-category-name',
    category_code: 'sub-category-code',
    description: 'sub-category-description',
    status: 'sub-category-status',
};

/** The sub-category form, rendered by both the create page and the edit page. */
@Component({
    selector: 'sub-category-form',
    imports: [DigitsPipe, ReactiveFormsModule, NgIcon, NzButtonModule, NzDividerModule, NzFormModule, NzInputModule, NzSelectModule, TranslatePipe, TextPipe, CategoryQuickAddComponent],
    providers: [ChoicesService, provideIcons({ lucidePlus, lucideSparkles })],
    templateUrl: './sub-category-form.component.html',
    styleUrl: './sub-category-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubCategoryFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _subCategories = inject(SubCategoryService);
    private readonly _choices = inject(ChoicesService);
    private readonly _codes = inject(CodeGeneratorService);
    private readonly _session = inject(SessionService);
    private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly formId = 'sub-category-form';

    readonly editing = input<SubCategory | null>(null);

    readonly submitted = output<void>();

    // Declared before the group, because the name check reads it: a name is unique within its category.
    private readonly _parent = this._builder.control('', [Validators.required]);

    readonly form = this._builder.group({
        category_oid: this._parent,
        name: ['', [Validators.required, Validators.maxLength(255)], [uniqueValue((value) => this._subCategories.isAvailable('name', value, { oid: this.editing()?.oid, categoryOid: this._parent.value }), { isOwn: (value) => this.isOwnName(value) })]],
        category_code: ['', [Validators.required, Validators.maxLength(50)], [uniqueValue((value) => this._subCategories.isAvailable('category_code', value, { oid: this.editing()?.oid }), { isOwn: (value) => this.isOwnCode(value) })]],
        description: ['', [Validators.maxLength(1000)]],
        status: ['Active' as SubCategoryStatus, [Validators.required]],
    });

    private readonly _status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly remaining = computed(() => {
        const value = this._value();
        return [value.category_oid, value.name, value.category_code, value.status].filter((field) => !field?.toString().trim()).length;
    });

    readonly checking = computed(() => this._status() === 'PENDING');

    // The parent picker, loaded with the form.
    private readonly _loaded = signal<readonly Choice[]>([]);
    readonly categoriesLoading = signal(true);
    readonly categoriesFailed = signal(false);

    /**
     * The Active categories, plus the one being edited when it has since been turned Inactive, so
     * the picker names it rather than showing a bare id.
     */
    readonly categories = computed<readonly Choice[]>(() => {
        const loaded = this._loaded();
        const record = this.editing();
        if (!record?.category_name || loaded.some((choice) => choice.value === record.category_oid)) return loaded;
        return [{ value: record.category_oid, label: record.category_name }, ...loaded];
    });

    readonly canAddCategory = computed(() => this._session.can('configuration.category.create'));

    /** What was typed in the picker's search, so the drawer can start from it. */
    readonly categorySearch = signal('');

    /** Null while the drawer is closed; the name to start it from while open. */
    readonly quickAddName = signal<string | null>(null);

    /** Held here so opening the drawer can close the picker, which would otherwise stay open behind it. */
    readonly parentOpen = signal(false);

    constructor() {
        afterNextRender(() => {
            for (const field of ['category_oid', 'status'] as const) this._host.nativeElement.querySelector(`#${FIELD_ID[field]}`)?.setAttribute('aria-describedby', `${FIELD_ID[field]}-help`);
        });

        this.loadCategories();

        // A name is unique within its category, so a new category is a new question about the name.
        this.form.controls.category_oid.valueChanges.subscribe(() => this.form.controls.name.updateValueAndValidity());

        effect(() => {
            const record = this.editing();
            if (!record) return;

            this.form.setValue({
                category_oid: record.category_oid,
                name: record.name,
                category_code: record.category_code,
                description: record.description ?? '',
                status: record.status,
            });
            this.form.markAsPristine();
        });
    }

    loadCategories(): void {
        this.categoriesLoading.set(true);
        this.categoriesFailed.set(false);
        this._choices.load(CATEGORIES).subscribe({
            next: (choices) => {
                this._loaded.set(choices);
                this.categoriesLoading.set(false);
            },
            error: () => {
                this.categoriesLoading.set(false);
                this.categoriesFailed.set(true);
            },
        });
    }

    openQuickAdd(): void {
        this.quickAddName.set(this.categorySearch());
        this.parentOpen.set(false);
    }

    parentOpenChanged(open: boolean): void {
        this.parentOpen.set(open);
        if (!open) this.categorySearch.set('');
    }

    /** The new category is added to the picker and picked for them. */
    categoryAdded(category: { oid: string; name: string }): void {
        this.quickAddName.set(null);
        this._loaded.update((choices) => [...choices, { value: category.oid, label: category.name }].sort((a, b) => String(a.label).localeCompare(String(b.label))));
        this.form.controls.category_oid.setValue(category.oid);
        this.form.controls.category_oid.markAsDirty();
    }

    payload(): SubCategoryPayload {
        const raw = this.form.getRawValue();
        return {
            ...(this.editing()?.oid ? { oid: this.editing()!.oid } : {}),
            name: raw.name.trim(),
            category_code: raw.category_code.trim().toUpperCase(),
            category_oid: raw.category_oid,
            description: raw.description.trim() || null,
            status: raw.status,
        };
    }

    /** Whether the form may be sent, once the availability checks in flight have answered. */
    ready(): Observable<boolean> {
        revealErrors(this.form);
        return this.form.statusChanges.pipe(
            startWith(this.form.status),
            filter((status) => status !== 'PENDING'),
            take(1),
            map((status) => status === 'VALID')
        );
    }

    reject(field: SubCategoryField | 'category_oid'): void {
        const control = this.form.controls[field];
        control.setErrors({ ...(control.errors ?? {}), [field === 'category_oid' ? 'inactive' : 'taken']: true });
        control.markAsTouched();
    }

    /** Its own name, under its own category, compared the way the unique index compares. */
    private isOwnName(value: string): boolean {
        const record = this.editing();
        return !!record && record.category_oid === this._parent.value && record.name.trim().toLowerCase() === value.toLowerCase();
    }

    private isOwnCode(value: string): boolean {
        const own = this.editing()?.category_code;
        return !!own && own.trim().toUpperCase() === value.toUpperCase();
    }

    invalid(field: SubCategoryFormField): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    describedBy(field: SubCategoryFormField): string {
        return `${FIELD_ID[field]}-${this.invalid(field) ? 'error' : 'help'}`;
    }

    generateCode(): void {
        this._codes.ask({ name: this.form.controls.name.value, generate: (name) => this._subCategories.generateCode(name, this.editing()?.oid) }).subscribe((code) => {
            if (!code) return;
            this.form.controls.category_code.setValue(code);
            this.form.controls.category_code.markAsDirty();
        });
    }
}
