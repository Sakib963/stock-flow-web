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
import { AISLE_STORAGE_TYPES, Aisle, AisleField, AisleFormField, AislePayload, AisleStatus, AisleStorageType } from '@app/core/models/aisle.model';
import { SessionService } from '@app/core/services/session/session.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { WarehouseQuickAddComponent } from '@app/modules/configuration/aisle/components/warehouse-quick-add/warehouse-quick-add.component';
import { AisleService } from '@app/modules/configuration/aisle/services/aisle.service';
import { ChoicesService } from '@app/shared/services/choices/choices.service';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { uniqueValue } from '@app/shared/utils/unique-value/unique-value';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';

const WAREHOUSES: RemoteChoices = { endpoint: APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN };

const FIELD_ID: Record<AisleFormField, string> = {
    warehouse_oid: 'aisle-parent',
    name: 'aisle-name',
    code: 'aisle-code',
    storage_type: 'aisle-storage',
    capacity_units: 'aisle-capacity',
    special_notes: 'aisle-notes',
    status: 'aisle-status',
};

/** The aisle form, rendered by both the create page and the edit page. */
@Component({
    selector: 'aisle-form',
    imports: [DigitsPipe, ReactiveFormsModule, NgIcon, NzButtonModule, NzDividerModule, NzFormModule, NzInputModule, NzSelectModule, TranslatePipe, TextPipe, WarehouseQuickAddComponent],
    providers: [ChoicesService, provideIcons({ lucidePlus, lucideSparkles })],
    templateUrl: './aisle-form.component.html',
    styleUrl: './aisle-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AisleFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _aisles = inject(AisleService);
    private readonly _choices = inject(ChoicesService);
    private readonly _codes = inject(CodeGeneratorService);
    private readonly _session = inject(SessionService);
    private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly storageTypes = AISLE_STORAGE_TYPES;

    readonly formId = 'aisle-form';

    readonly editing = input<Aisle | null>(null);

    readonly submitted = output<void>();

    // Declared before the group, because the name check reads it: a name is unique within its warehouse.
    private readonly _parent = this._builder.control('', [Validators.required]);

    readonly form = this._builder.group({
        warehouse_oid: this._parent,
        name: ['', [Validators.required, Validators.maxLength(255)], [uniqueValue((value) => this._aisles.isAvailable('name', value, { oid: this.editing()?.oid, warehouseOid: this._parent.value }), { isOwn: (value) => this.isOwnName(value) })]],
        code: ['', [Validators.required, Validators.maxLength(50)], [uniqueValue((value) => this._aisles.isAvailable('code', value, { oid: this.editing()?.oid }), { isOwn: (value) => this.isOwnCode(value) })]],
        storage_type: [null as AisleStorageType | null],
        capacity_units: [null as number | null, [Validators.min(1), Validators.pattern(/^\d+$/)]],
        special_notes: ['', [Validators.maxLength(1000)]],
        status: ['Active' as AisleStatus, [Validators.required]],
    });

    private readonly _status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly remaining = computed(() => {
        const value = this._value();
        return [value.warehouse_oid, value.name, value.code, value.status].filter((field) => !field?.toString().trim()).length;
    });

    readonly checking = computed(() => this._status() === 'PENDING');

    // The parent picker, loaded with the form.
    private readonly _loaded = signal<readonly Choice[]>([]);
    readonly warehousesLoading = signal(true);
    readonly warehousesFailed = signal(false);

    /**
     * The Active warehouses, plus the one being edited when it has since been turned Inactive, so
     * the picker names it rather than showing a bare id.
     */
    readonly warehouses = computed<readonly Choice[]>(() => {
        const loaded = this._loaded();
        const record = this.editing();
        if (!record?.warehouse_name || loaded.some((choice) => choice.value === record.warehouse_oid)) return loaded;
        return [{ value: record.warehouse_oid, label: record.warehouse_name }, ...loaded];
    });

    readonly canAddWarehouse = computed(() => this._session.can('configuration.warehouse.create'));

    /** What was typed in the picker's search, so the drawer can start from it. */
    readonly warehouseSearch = signal('');

    /** Null while the drawer is closed; the name to start it from while open. */
    readonly quickAddName = signal<string | null>(null);

    /** Held here so opening the drawer can close the picker, which would otherwise stay open behind it. */
    readonly parentOpen = signal(false);

    constructor() {
        afterNextRender(() => {
            for (const field of ['warehouse_oid', 'status'] as const) this._host.nativeElement.querySelector(`#${FIELD_ID[field]}`)?.setAttribute('aria-describedby', `${FIELD_ID[field]}-help`);
        });

        this.loadWarehouses();

        // A name is unique within its warehouse, so a new warehouse is a new question about the name.
        this.form.controls.warehouse_oid.valueChanges.subscribe(() => this.form.controls.name.updateValueAndValidity());

        effect(() => {
            const record = this.editing();
            if (!record) return;

            this.form.setValue({
                warehouse_oid: record.warehouse_oid,
                name: record.name,
                code: record.code,
                storage_type: record.storage_type ?? null,
                capacity_units: record.capacity_units ?? null,
                special_notes: record.special_notes ?? '',
                status: record.status,
            });
            this.form.markAsPristine();
        });
    }

    loadWarehouses(): void {
        this.warehousesLoading.set(true);
        this.warehousesFailed.set(false);
        this._choices.load(WAREHOUSES).subscribe({
            next: (choices) => {
                this._loaded.set(choices);
                this.warehousesLoading.set(false);
            },
            error: () => {
                this.warehousesLoading.set(false);
                this.warehousesFailed.set(true);
            },
        });
    }

    openQuickAdd(): void {
        this.quickAddName.set(this.warehouseSearch());
        this.parentOpen.set(false);
    }

    parentOpenChanged(open: boolean): void {
        this.parentOpen.set(open);
        if (!open) this.warehouseSearch.set('');
    }

    /** The new warehouse is added to the picker and picked for them. */
    warehouseAdded(warehouse: { oid: string; name: string }): void {
        this.quickAddName.set(null);
        this._loaded.update((choices) => [...choices, { value: warehouse.oid, label: warehouse.name }].sort((a, b) => String(a.label).localeCompare(String(b.label))));
        this.form.controls.warehouse_oid.setValue(warehouse.oid);
        this.form.controls.warehouse_oid.markAsDirty();
    }

    payload(): AislePayload {
        const raw = this.form.getRawValue();
        return {
            ...(this.editing()?.oid ? { oid: this.editing()!.oid } : {}),
            name: raw.name.trim(),
            code: raw.code.trim().toUpperCase(),
            warehouse_oid: raw.warehouse_oid,
            storage_type: raw.storage_type || null,
            capacity_units: raw.capacity_units ? Number(raw.capacity_units) : null,
            special_notes: raw.special_notes.trim() || null,
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

    reject(field: AisleField | 'warehouse_oid'): void {
        const control = this.form.controls[field];
        control.setErrors({ ...(control.errors ?? {}), [field === 'warehouse_oid' ? 'inactive' : 'taken']: true });
        control.markAsTouched();
    }

    /** Its own name, under its own warehouse, compared the way the unique index compares. */
    private isOwnName(value: string): boolean {
        const record = this.editing();
        return !!record && record.warehouse_oid === this._parent.value && record.name.trim().toLowerCase() === value.toLowerCase();
    }

    private isOwnCode(value: string): boolean {
        const own = this.editing()?.code;
        return !!own && own.trim().toUpperCase() === value.toUpperCase();
    }

    invalid(field: AisleFormField): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    describedBy(field: AisleFormField): string {
        return `${FIELD_ID[field]}-${this.invalid(field) ? 'error' : 'help'}`;
    }

    generateCode(): void {
        this._codes.ask({ name: this.form.controls.name.value, generate: (name) => this._aisles.generateCode(name, this.editing()?.oid) }).subscribe((code) => {
            if (!code) return;
            this.form.controls.code.setValue(code);
            this.form.controls.code.markAsDirty();
        });
    }
}
