import { Component, computed, DestroyRef, HostListener, inject, input, OnInit, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { checkRequiredValidator, markFormGroupTouched } from '@app/core/constants/helper';
import { HttpService } from '@app/core/services/http.service';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { FormActions } from '@app/core/interfaces/form-action';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { CurrencyFormatPipe } from '@app/shared/pipe/currency-format.pipe';

@Component({
    selector: 'product-dispose-form',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, PrimaryButton, SecondaryButton, CurrencyFormatPipe],
    templateUrl: './product-dispose-form.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './product-dispose-form.component.scss',
})
export class ProductDisposeFormComponent implements OnInit {
    dispose = input<any>(undefined);
    readonly actions = output<FormActions>();
    buttonLoading = input(false);

    private readonly _formBuilder = inject(FormBuilder);
    private readonly _modalService = inject(NzModalService);
    private readonly _httpService = inject(HttpService);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _destroyRef = inject(DestroyRef);

    form = this._formBuilder.group({
        oid: [null],
        disposal_date: [<Date | null>new Date(), Validators.required],
        disposal_method: [null, Validators.required],
        notes: [null],
        products: this._formBuilder.array([]),
    });

    drawerForm = this._createLineGroup();

    batchList: any[] = [];
    groupedBatchList: any[] = [];
    batchListLoading = signal(false);

    disposalMethods = DROPDOWN_OPTIONS.DISPOSAL_METHODS;
    disposalReasons = DROPDOWN_OPTIONS.DISPOSAL_REASONS;

    visible = false;
    editIndex: number | null = null;
    totalQuantity = 0;
    totalLoss = 0;
    drawerWidth = signal<string>('700px');

    private readonly _reasonLabelByValue = new Map<string, string>(this.disposalReasons.map((r) => [r.value, r.label]));
    private readonly _productNameByOid = new Map<string, string>();
    private readonly _batchByInventoryOid = new Map<string, any>();

    mode = computed(() => (this.dispose() ? 'edit' : 'create'));

    confirmationMessage = computed(() => (this.mode() === 'edit' ? 'Are you sure you want to update this disposal?' : 'Are you sure you want to create this disposal?'));

    ngOnInit(): void {
        this._setDrawerWidth();
        this.loadBatchList();

        const dispose = this.dispose();
        if (dispose) {
            this._patchForm(dispose);
        }

        // The drawer form is (re)created and wired in handleAdd/handleItemEdit,
        // so its batch listener lives in _wireDrawerBatchListener().

        this.products.valueChanges.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => {
            this.calculateTotals();
        });
    }

    @HostListener('window:resize')
    onWindowResize(): void {
        this._setDrawerWidth();
    }

    private _setDrawerWidth(): void {
        if (typeof window === 'undefined') return;
        this.drawerWidth.set(window.innerWidth < 768 ? '100vw' : '600px');
    }

    private _createLineGroup(line: any = {}): FormGroup {
        const quantityValidators = line.available_quantity != null ? [Validators.required, Validators.min(1), Validators.max(line.available_quantity)] : [Validators.required, Validators.min(1)];
        return this._formBuilder.group({
            oid: [line.oid ?? null],
            product_oid: [line.product_oid ?? null, Validators.required],
            inventory_oid: [line.inventory_oid ?? null, Validators.required],
            available_quantity: [line.available_quantity ?? null],
            dispose_quantity: [line.dispose_quantity ?? null, quantityValidators],
            reason: [line.reason ?? null, Validators.required],
            line_note: [line.line_note ?? null],
            cost_price: [line.cost_price ?? null],
        });
    }

    private _patchForm(dispose: any): void {
        if (!dispose) return;

        this._productNameByOid.clear();

        this.form.patchValue({
            oid: dispose.oid ?? null,
            disposal_date: dispose.disposal_date ? new Date(dispose.disposal_date) : new Date(),
            disposal_method: dispose.disposal_method ?? null,
            notes: dispose.notes ?? null,
        });

        this.products.clear();
        (dispose.products || []).forEach((line: any) => {
            if (line?.product_oid && line?.product_name) {
                this._productNameByOid.set(line.product_oid, line.product_name);
            }
            if (line?.inventory_oid) {
                this._batchByInventoryOid.set(line.inventory_oid, {
                    inventory_oid: line.inventory_oid,
                    product_oid: line.product_oid,
                    batch_code: line.batch_code,
                    quantity_available: line.available_quantity ?? line.quantity_available ?? line.dispose_quantity,
                    cost_price: line.cost_price,
                    product_name: line.product_name,
                });
            }
            this.products.push(this._createLineGroup(line));
        });

        this.calculateTotals();
    }

    get products(): FormArray {
        return this.form.get('products') as FormArray;
    }

    get productRows(): any[] {
        return this.products.value as any[];
    }

    calculateTotals(): void {
        const rows = this.products.value;
        this.totalQuantity = rows.reduce((acc: number, line: any) => acc + Number(line.dispose_quantity || 0), 0);
        this.totalLoss = rows.reduce((acc: number, line: any) => acc + Number(line.cost_price || 0) * Number(line.dispose_quantity || 0), 0);
    }

    handleAdd(): void {
        this.editIndex = null;
        this.drawerForm = this._createLineGroup();
        this._wireDrawerBatchListener();
        this.visible = true;
        this.loadBatchList();
    }

    private _wireDrawerBatchListener(): void {
        this.drawerForm
            .get('inventory_oid')
            ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((inventoryOid: any) => {
                const batch = this._batchByInventoryOid.get(inventoryOid);
                const quantityControl = this.drawerForm.get('dispose_quantity');
                if (batch) {
                    this.drawerForm.get('product_oid')?.setValue(batch.product_oid, { emitEvent: false });
                    this.drawerForm.get('available_quantity')?.setValue(batch.quantity_available, { emitEvent: false });
                    this.drawerForm.get('cost_price')?.setValue(batch.cost_price, { emitEvent: false });
                    quantityControl?.setValidators([Validators.required, Validators.min(1), Validators.max(batch.quantity_available)]);
                } else {
                    this.drawerForm.get('available_quantity')?.setValue(null, { emitEvent: false });
                    this.drawerForm.get('cost_price')?.setValue(null, { emitEvent: false });
                    quantityControl?.setValidators([Validators.required, Validators.min(1)]);
                }
                quantityControl?.updateValueAndValidity({ emitEvent: false });
            });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            markFormGroupTouched(this.form);
            return;
        }

        if (!this.products.length) {
            this._notificationService.warning('Warning!', 'You have to add at least 1 product to dispose');
            return;
        }

        const formValue = this.form.getRawValue();
        this.showConfirmationModal(formValue);
    }

    showConfirmationModal(payload: any): void {
        this._modalService.create({
            nzContent: ConfirmationModalComponent,
            nzData: { message: this.confirmationMessage() },
            nzFooter: null,
            nzClosable: false,
            nzOnOk: () => this.handleForm(payload),
        });
    }

    handleForm(payload: any): void {
        const mode = this.mode();
        if (mode === 'create') {
            this.actions.emit({ action: 'save', data: payload });
        } else {
            this.actions.emit({ action: 'update', data: payload });
        }
    }

    onCancel(): void {
        this.actions.emit({ action: 'cancel' });
    }

    resetForm(): void {
        this.products.clear();
        this.form.reset({ oid: null, disposal_date: new Date(), disposal_method: null, notes: null });
        this.totalQuantity = 0;
        this.totalLoss = 0;
    }

    close(): void {
        this.editIndex = null;
        this.visible = false;
    }

    hasRequiredValidator(controlName: string): boolean {
        const control = this.form.get(controlName);
        return control ? checkRequiredValidator(control) : false;
    }

    hasRequiredValidatorDrawerForm(controlName: string): boolean {
        const control = this.drawerForm.get(controlName);
        return control ? checkRequiredValidator(control) : false;
    }

    checkDisabledStatus(inventoryOid: any): boolean {
        return this.products.value.some((item: any, index: number) => index !== this.editIndex && item.inventory_oid === inventoryOid);
    }

    handleDrawerForm(): void {
        if (this.drawerForm.valid) {
            const lineData = this.drawerForm.getRawValue();
            if (this.editIndex !== null) {
                this.products.at(this.editIndex).patchValue(lineData);
                this.editIndex = null;
            } else {
                this.products.push(this._createLineGroup(lineData));
            }
            this.visible = false;
        } else {
            markFormGroupTouched(this.drawerForm);
        }
    }

    handleItemEdit(index: number): void {
        this.editIndex = index;
        const line = this.products.at(index).value;
        this.drawerForm = this._createLineGroup(line);
        this._wireDrawerBatchListener();
        this.loadBatchList();
        this.visible = true;
    }

    handleItemDelete(index: number): void {
        this.products.removeAt(index);
    }

    getProductName(inventoryOid: string, productOid: string): string {
        const batch = this._batchByInventoryOid.get(inventoryOid);
        if (batch?.product_name) {
            return batch.product_name;
        }
        return this._productNameByOid.get(productOid) || 'Unknown Product';
    }

    getBatchCode(inventoryOid: string): string {
        return this._batchByInventoryOid.get(inventoryOid)?.batch_code || '-';
    }

    getReasonLabel(value: string): string {
        return this._reasonLabelByValue.get(value) || value || '-';
    }

    calculateLineLoss(line: any): number {
        return Number(line?.cost_price || 0) * Number(line?.dispose_quantity || 0);
    }

    loadBatchList(): void {
        this.batchListLoading.set(true);
        this._httpService
            .get(APIEndpoint.GET_PRODUCT_LIST_FOR_DISPOSE_DROPDOWN)
            .pipe(finalize(() => this.batchListLoading.set(false)))
            .subscribe({
                next: (res: any) => {
                    const rows = res?.body?.code === 200 ? res.body.data || [] : [];
                    this.batchList = rows;
                    rows.forEach((row: any) => this._batchByInventoryOid.set(row.inventory_oid, row));
                    this.groupedBatchList = this._groupByProduct(rows);
                },
            });
    }

    private _groupByProduct(rows: any[]): any[] {
        const groups = new Map<string, any>();
        rows.forEach((row: any) => {
            const key = row.product_name || 'Unknown Product';
            if (!groups.has(key)) {
                groups.set(key, { label: key, options: [] });
            }
            groups.get(key).options.push({
                label: `${row.batch_code} (Available: ${row.quantity_available})`,
                value: row.inventory_oid,
                ...row,
            });
        });
        return Array.from(groups.values());
    }
}
