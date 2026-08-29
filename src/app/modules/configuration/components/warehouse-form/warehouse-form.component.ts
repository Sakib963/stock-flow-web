import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { FormActions } from '@app/core/interfaces/form-action';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzModalService } from 'ng-zorro-antd/modal';

@Component({
    selector: 'warehouse-form',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule],
    templateUrl: './warehouse-form.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './warehouse-form.component.scss',
})
export class WarehouseFormComponent {
    warehouse = input<any>(undefined);
    readonly actions = output<FormActions>();
    buttonLoading = input(false);

    private readonly _formBuilder = inject(FormBuilder);
    private readonly _modalService = inject(NzModalService);

    mode = computed(() => {
        return this.warehouse() ? 'edit' : 'create';
    });

    confirmationMessage = computed(() => {
        return this.mode() === 'edit' ? 'Are you sure you want to update this warehouse?' : 'Are you sure you want to create this warehouse?';
    });

    form = this._formBuilder.nonNullable.group({
        oid: [null],
        name: ['', [Validators.required]],
        code: ['', [Validators.required]],
        location: [''],
        capacity: [''],
        status: ['Active', [Validators.required]],
    });

    ngOnInit(): void {
        const warehouse = this.warehouse();
        if (warehouse) {
            this._patchForm(warehouse);
        }
    }

    private _patchForm(warehouse: any): void {
        if (!warehouse) return;

        this.form.patchValue(warehouse);
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
        this.form.reset();
    }

    onCancel(): void {
        this.actions.emit({ action: 'cancel' });
    }

    hasRequiredValidator(controlName: string): boolean {
        const control = this.form.get(controlName);
        if (!control) return false;

        return control.hasValidator(Validators.required);
    }
}
