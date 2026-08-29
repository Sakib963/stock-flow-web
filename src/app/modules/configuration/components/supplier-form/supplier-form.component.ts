import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { FormActions } from '@app/core/interfaces/form-action';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzModalService } from 'ng-zorro-antd/modal';

@Component({
    selector: 'supplier-form',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule],
    templateUrl: './supplier-form.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './supplier-form.component.scss',
})
export class SupplierFormComponent {
    supplier = input<any>(undefined);
    readonly actions = output<FormActions>();
    buttonLoading = input(false);

    private readonly _formBuilder = inject(FormBuilder);
    private readonly _modalService = inject(NzModalService);

    mode = computed(() => {
        return this.supplier() ? 'edit' : 'create';
    });

    confirmationMessage = computed(() => {
        return this.mode() === 'edit' ? 'Are you sure you want to update this supplier?' : 'Are you sure you want to create this supplier?';
    });

    form = this._formBuilder.nonNullable.group({
        oid: [null],
        name: [null, [Validators.required]],
        contact_person: [null],
        phone_number: [null, [Validators.required, Validators.pattern(/^(?:\+?88)?0\d{7,10}$/)]],
        email: [null, [Validators.required, Validators.email]],
        address: [null],
        status: ['Active', [Validators.required]],
    });

    ngOnInit(): void {
        const supplier = this.supplier();
        if (supplier) {
            this._patchForm(supplier);
        }
    }

    private _patchForm(supplier: any): void {
        if (!supplier) return;

        this.form.patchValue(supplier);
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
