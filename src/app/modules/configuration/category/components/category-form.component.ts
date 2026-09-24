import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSparkles } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, filter, map, startWith, take } from 'rxjs';

import { Category, CategoryField, CategoryFormField, CategoryPayload, CategoryStatus } from '@app/core/models/category.model';
import { CategoryService } from '@app/modules/configuration/category/services/category.service';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';
import { uniqueValue } from '@app/shared/utils/unique-value/unique-value';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';

/**
 * The id each field's control, helper and error share, looked up rather than built from the field
 * name. Building it turned `category_code` into `category-category-code`, so the code field pointed
 * its `aria-describedby` at an element that was never rendered and a screen reader got neither the
 * helper nor the error.
 */
const FIELD_ID: Record<CategoryFormField, string> = {
    name: 'category-name',
    category_code: 'category-code',
    description: 'category-description',
    status: 'category-status',
};

/**
 * The category form itself, rendered by both the create page and the edit page.
 *
 * It owns the fields and what makes them valid, and nothing else: no route, no saving, no
 * navigation. The page around it decides what a valid form means.
 */
@Component({
    selector: 'category-form',
    imports: [DigitsPipe, ReactiveFormsModule, NgIcon, NzButtonModule, NzFormModule, NzInputModule, NzSelectModule, TranslatePipe],
    providers: [provideIcons({ lucideSparkles })],
    templateUrl: './category-form.component.html',
    styleUrl: './category-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _categories = inject(CategoryService);
    private readonly _codes = inject(CodeGeneratorService);
    private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly formId = 'category-form';

    /** The category being edited, so its own name and code are not reported as taken. */
    readonly editing = input<Category | null>(null);

    readonly submitted = output<void>();

    readonly form = this._builder.group({
        name: ['', [Validators.required, Validators.maxLength(255)], [uniqueValue((value) => this._categories.isAvailable('name', value, this.editing()?.oid), { isOwn: (value) => this.isOwn('name', value) })]],
        category_code: ['', [Validators.required, Validators.maxLength(50)], [uniqueValue((value) => this._categories.isAvailable('category_code', value, this.editing()?.oid), { isOwn: (value) => this.isOwn('category_code', value) })]],
        description: ['', [Validators.maxLength(1000)]],
        status: ['Active' as CategoryStatus, [Validators.required]],
    });

    private readonly _status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    /** What Save is still waiting for, counted for the action bar. */
    readonly remaining = computed(() => {
        const value = this._value();
        return [value.name, value.category_code, value.status].filter((field) => !field?.toString().trim()).length;
    });

    readonly checking = computed(() => this._status() === 'PENDING');

    constructor() {
        // Status has no error state, so its description never changes and is set once.
        afterNextRender(() => this._host.nativeElement.querySelector(`#${FIELD_ID.status}`)?.setAttribute('aria-describedby', `${FIELD_ID.status}-help`));

        // The record arrives after the form does, because the page has to fetch it first. Filling
        // from the input means the page hands over what it loaded and nothing reaches into here.
        effect(() => {
            const category = this.editing();
            if (!category) return;

            this.form.setValue({
                name: category.name,
                category_code: category.category_code,
                description: category.description ?? '',
                status: category.status,
            });
            // Loading a record is not someone typing, so leaving straight after must not ask.
            this.form.markAsPristine();
        });
    }

    payload(): CategoryPayload {
        const raw = this.form.getRawValue();
        return {
            ...(this.editing()?.oid ? { oid: this.editing()!.oid } : {}),
            name: raw.name.trim(),
            category_code: raw.category_code.trim().toUpperCase(),
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
        this.form.markAllAsTouched();

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
    reject(field: CategoryField): void {
        const control = this.form.controls[field];
        control.setErrors({ ...(control.errors ?? {}), taken: true });
        control.markAsTouched();
    }

    /** Case does not matter: the unique indexes compare case-insensitively, and the category is excluded from its own check anyway. */
    private isOwn(field: CategoryField, value: string): boolean {
        const own = this.editing()?.[field];
        return !!own && own.trim().toLowerCase() === value.toLowerCase();
    }

    invalid(field: CategoryFormField): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    /** Whichever of the two is on screen: the error replaces the helper, it never stacks with it. */
    describedBy(field: CategoryFormField): string {
        return `${FIELD_ID[field]}-${this.invalid(field) ? 'error' : 'help'}`;
    }

    generateCode(): void {
        this._codes.ask({ name: this.form.controls.name.value, generate: (name) => this._categories.generateCode(name, this.editing()?.oid) }).subscribe((code) => {
            if (!code) return;
            this.form.controls.category_code.setValue(code);
            this.form.controls.category_code.markAsDirty();
        });
    }
}
