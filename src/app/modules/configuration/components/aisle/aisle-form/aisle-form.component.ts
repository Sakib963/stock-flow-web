import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, OnInit, output, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { FormActions } from '@app/core/interfaces/form-action';
import { HttpService } from '@app/core/services/http.service';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-aisle-form',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule],
    templateUrl: './aisle-form.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./aisle-form.component.scss'],
})
export class AisleFormComponent implements OnInit {
    formData = input<any>(undefined);
    readonly actions = output<FormActions>();
    buttonLoading = input(false);

    private readonly _formBuilder = inject(FormBuilder);
    private readonly _modalService = inject(NzModalService);
    private readonly _httpService = inject(HttpService);
    private readonly _destroyRef = inject(DestroyRef);

    warehouseList: any[] = [];
    storageTypes: any[] = [];

    mode = computed(() => {
        return this.formData() ? 'edit' : 'create';
    });

    confirmationMessage = computed(() => {
        return this.mode() === 'edit' ? 'Are you sure you want to update this aisle?' : 'Are you sure you want to create this aisle?';
    });

    form = this._formBuilder.nonNullable.group({
        oid: [null as any],
        name: ['', [Validators.required]],
        code: ['', [Validators.required]],
        warehouse_oid: [null as any, [Validators.required]],
        capacity: [''],
        type_of_storage: [null as any],
        special_notes: [''],
        status: ['Active', [Validators.required]],
    });

    ngOnInit(): void {
        const aisle = this.formData();
        if (aisle) {
            this._patchForm(aisle);
        }

        this.loadWarehouseList();
        this.storageTypes = DROPDOWN_OPTIONS.STORAGE_TYPES;
    }

    private _patchForm(aisle: any): void {
        if (!aisle) return;

        this.form.patchValue(aisle);
    }

    onSubmit(): void {
        if (this.form.invalid) {
            markFormGroupTouched(this.form);
            return;
        }

        const formValue = this.form.getRawValue();
        this.showConfirmationModal(formValue);
    }

    showConfirmationModal(payload: any): void {
        this._modalService.create({
            nzContent: ConfirmationModalComponent,
            nzData: {
                message: this.confirmationMessage(),
            },
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

    resetForm(): void {
        this.form.reset({ status: 'Active' });
    }

    onCancel(): void {
        this.actions.emit({ action: 'cancel' });
    }

    hasRequiredValidator(controlName: string): boolean {
        const control = this.form.get(controlName);
        if (!control) return false;

        return control.hasValidator(Validators.required);
    }

    loadWarehouseList(): void {
        this._httpService
            .get(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {})
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) {
                        this.warehouseList = res.body?.data || [];
                    }
                },
                error: (err: any) => {
                    console.error('Failed to load warehouse list:', err);
                    this.warehouseList = [];
                },
            });
    }
}
