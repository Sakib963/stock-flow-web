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

import { Warehouse, WarehouseField, WarehouseFormField, WarehousePayload, WarehouseStatus } from '@app/core/models/warehouse.model';
import { WarehouseService } from '@app/modules/configuration/warehouse/services/warehouse.service';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { uniqueValue } from '@app/shared/utils/unique-value/unique-value';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';

/**
 * The id each field's control, helper and error share, looked up rather than built from the field
 * name. Building it turned `code` into `warehouse-warehouse-code`, so the code field pointed
 * its `aria-describedby` at an element that was never rendered and a screen reader got neither the
 * helper nor the error.
 */
const FIELD_ID: Record<WarehouseFormField, string> = {
    name: 'warehouse-name',
    code: 'warehouse-code',
    location: 'warehouse-location',
    capacity_units: 'warehouse-capacity',
    status: 'warehouse-status',
};

/**
 * The warehouse form itself, rendered by both the create page and the edit page.
 *
 * It owns the fields and what makes them valid, and nothing else: no route, no saving, no
 * navigation. The page around it decides what a valid form means.
 */
@Component({
    selector: 'warehouse-form',
    imports: [DigitsPipe, ReactiveFormsModule, NgIcon, NzButtonModule, NzFormModule, NzInputModule, NzSelectModule, TranslatePipe],
    providers: [provideIcons({ lucideSparkles })],
    templateUrl: './warehouse-form.component.html',
    styleUrl: './warehouse-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _warehouses = inject(WarehouseService);
    private readonly _codes = inject(CodeGeneratorService);
    private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly formId = 'warehouse-form';

    /** The warehouse being edited, so its own name and code are not reported as taken. */
    readonly editing = input<Warehouse | null>(null);

    /** One field per row, for a narrow surface such as the quick-add drawer on the aisle form. */
    readonly stacked = input(false);

    readonly submitted = output<void>();

    readonly form = this._builder.group({
        name: ['', [Validators.required, Validators.maxLength(255)], [uniqueValue((value) => this._warehouses.isAvailable('name', value, this.editing()?.oid), { isOwn: (value) => this.isOwn('name', value) })]],
        code: ['', [Validators.required, Validators.maxLength(50)], [uniqueValue((value) => this._warehouses.isAvailable('code', value, this.editing()?.oid), { isOwn: (value) => this.isOwn('code', value) })]],
        capacity_units: [null as number | null, [Validators.min(1), Validators.pattern(/^\d+$/)]],
        location: ['', [Validators.maxLength(1000)]],
        status: ['Active' as WarehouseStatus, [Validators.required]],
    });

    private readonly _status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    /** What Save is still waiting for, counted for the action bar. */
    readonly remaining = computed(() => {
        const value = this._value();
        return [value.name, value.code, value.status].filter((field) => !field?.toString().trim()).length;
    });

    readonly checking = computed(() => this._status() === 'PENDING');

    constructor() {
        // Status has no error state, so its description never changes and is set once.
        afterNextRender(() => this._host.nativeElement.querySelector(`#${FIELD_ID.status}`)?.setAttribute('aria-describedby', `${FIELD_ID.status}-help`));

        // The record arrives after the form does, because the page has to fetch it first. Filling
        // from the input means the page hands over what it loaded and nothing reaches into here.
        effect(() => {
            const warehouse = this.editing();
            if (!warehouse) return;

            this.form.setValue({
                name: warehouse.name,
                code: warehouse.code,
                capacity_units: warehouse.capacity_units ?? null,
                location: warehouse.location ?? '',
                status: warehouse.status,
            });
            // Loading a record is not someone typing, so leaving straight after must not ask.
            this.form.markAsPristine();
        });
    }

    payload(): WarehousePayload {
        const raw = this.form.getRawValue();
        return {
            ...(this.editing()?.oid ? { oid: this.editing()!.oid } : {}),
            name: raw.name.trim(),
            code: raw.code.trim().toUpperCase(),
            capacity_units: raw.capacity_units ? Number(raw.capacity_units) : null,
            location: raw.location.trim() || null,
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
    reject(field: WarehouseField): void {
        const control = this.form.controls[field];
        control.setErrors({ ...(control.errors ?? {}), taken: true });
        control.markAsTouched();
    }

    /** Case does not matter: the unique indexes compare case-insensitively, and the warehouse is excluded from its own check anyway. */
    private isOwn(field: WarehouseField, value: string): boolean {
        const own = this.editing()?.[field];
        return !!own && own.trim().toLowerCase() === value.toLowerCase();
    }

    invalid(field: WarehouseFormField): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    /** Whichever of the two is on screen: the error replaces the helper, it never stacks with it. */
    describedBy(field: WarehouseFormField): string {
        return `${FIELD_ID[field]}-${this.invalid(field) ? 'error' : 'help'}`;
    }

    generateCode(): void {
        this._codes.ask({ name: this.form.controls.name.value, generate: (name) => this._warehouses.generateCode(name, this.editing()?.oid) }).subscribe((code) => {
            if (!code) return;
            this.form.controls.code.setValue(code);
            this.form.controls.code.markAsDirty();
        });
    }
}
